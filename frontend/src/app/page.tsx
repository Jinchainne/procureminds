"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { getProcurementClient, getRuntimeMode } from "../lib/client";
import type { Rfq, RfqInput, Supplier, SupplierInput } from "../lib/types";

const initialRfq: RfqInput = {
  title: "",
  requirements: "",
  evalCriteria: "",
  budgetCents: 0
};

const initialSupplier: SupplierInput = {
  name: "",
  websiteUrl: "",
  proposalUrl: "",
  priceCents: 0,
  claims: ""
};

function dollars(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

function txLine(label: string, value?: string) {
  return `[${new Date().toLocaleTimeString()}] ${label}${value ? `: ${value}` : ""}`;
}

function riskClass(risk: string) {
  if (risk === "LOW") return "badge live";
  if (risk === "HIGH") return "badge warn";
  return "badge";
}

export default function Home() {
  const runtime = getRuntimeMode();
  const client = useMemo(() => getProcurementClient(), []);
  const [rfqForm, setRfqForm] = useState<RfqInput>(initialRfq);
  const [supplierForm, setSupplierForm] = useState<SupplierInput>(initialSupplier);
  const [rfq, setRfq] = useState<Rfq | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loadRfqId, setLoadRfqId] = useState<string>("");
  const [signerAddress, setSignerAddress] = useState<string>("");
  const [totalRfqs, setTotalRfqs] = useState<number>(0);
  const [busy, setBusy] = useState<string>("");
  const [logs, setLogs] = useState<string[]>([txLine("App ready", runtime.mode === "setup" ? "contract setup required" : "live mode")]);
  const [error, setError] = useState<string>("");
  const contractReady = runtime.mode === "live";

  function pushLog(label: string, value?: string) {
    setLogs((current) => [txLine(label, value), ...current].slice(0, 8));
  }

  async function handleAction<T>(label: string, fn: () => Promise<T>) {
    setBusy(label);
    setError("");
    try {
      const result = await fn();
      pushLog(label, "success");
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      pushLog(label, message);
      throw err;
    } finally {
      setBusy("");
    }
  }

  useEffect(() => {
    let active = true;

    async function loadLatest() {
      setBusy("Load state");
      try {
        const [total, signer] = await Promise.all([client.getTotalRfqs(), client.getSignerAddress()]);
        if (!active) return;
        setTotalRfqs(total);
        setSignerAddress(signer ?? "");
        const latest = await client.getLatestRfq();
        if (!active) return;
        if (!latest) {
          pushLog("No saved RFQ", runtime.mode);
          return;
        }
        const latestSuppliers = await client.listSuppliers(latest.id);
        if (!active) return;
        setRfq(latest);
        setSuppliers(latestSuppliers);
        setLoadRfqId(String(latest.id));
        pushLog("Loaded RFQ", `#${latest.id}`);
      } catch (err) {
        if (!active) return;
        const message = err instanceof Error ? err.message : "Unable to load state";
        setError(message);
        pushLog("Load state", message);
      } finally {
        if (active) setBusy("");
      }
    }

    void loadLatest();

    return () => {
      active = false;
    };
  }, [client, runtime.mode]);

  async function refreshState() {
    const result = await handleAction("Refresh state", async () => {
      const [total, signer] = await Promise.all([client.getTotalRfqs(), client.getSignerAddress()]);
      const current = rfq ? await client.getRfq(rfq.id) : await client.getLatestRfq();
      const currentSuppliers = current ? await client.listSuppliers(current.id) : [];
      return { rfq: current, suppliers: currentSuppliers, total, signer };
    });
    if (!result) return;
    setTotalRfqs(result.total);
    setSignerAddress(result.signer ?? "");
    setRfq(result.rfq);
    setSuppliers(result.suppliers);
    if (result.rfq) setLoadRfqId(String(result.rfq.id));
  }

  async function connectWallet() {
    const address = await handleAction("Connect wallet", () => client.connectWallet());
    if (!address) return;
    setSignerAddress(address);
  }

  async function loadRfqById(event: FormEvent) {
    event.preventDefault();
    const id = Number(loadRfqId);
    if (!Number.isInteger(id) || id <= 0) {
      setError("Enter a valid RFQ id.");
      return;
    }
    const result = await handleAction(`Load RFQ #${id}`, async () => {
      const [loadedRfq, loadedSuppliers, total, signer] = await Promise.all([
        client.getRfq(id),
        client.listSuppliers(id),
        client.getTotalRfqs(),
        client.getSignerAddress()
      ]);
      return { rfq: loadedRfq, suppliers: loadedSuppliers, total, signer };
    });
    if (!result) return;
    setRfq(result.rfq);
    setSuppliers(result.suppliers);
    setTotalRfqs(result.total);
    setSignerAddress(result.signer ?? "");
  }

  async function createRfq(event: FormEvent) {
    event.preventDefault();
    const result = await handleAction("Create RFQ", () => client.createRfq(rfqForm));
    if (!result) return;
    setRfq(result.rfq);
    setSuppliers([]);
    if (result.tx?.txHash) pushLog("Transaction", result.tx.txHash);
  }

  async function submitSupplier(event: FormEvent) {
    event.preventDefault();
    if (!rfq) {
      setError("Create an RFQ first.");
      return;
    }
    const result = await handleAction("Submit supplier", () => client.submitSupplier(rfq.id, supplierForm));
    if (!result) return;
    setSuppliers((items) => [...items.filter((s) => s.supplierIndex !== result.supplier.supplierIndex), result.supplier].sort((a, b) => a.supplierIndex - b.supplierIndex));
    setRfq({ ...rfq, supplierCount: Math.max(rfq.supplierCount, result.supplier.supplierIndex) });
    if (result.tx?.txHash) pushLog("Transaction", result.tx.txHash);
  }

  async function evaluateSupplier(supplierIndex: number) {
    if (!rfq) return;
    const result = await handleAction(`Evaluate supplier #${supplierIndex}`, () => client.evaluateSupplier(rfq.id, supplierIndex));
    if (!result) return;
    setSuppliers((items) => items.map((item) => (item.supplierIndex === supplierIndex ? result.supplier : item)));
    if (result.tx?.txHash) pushLog("Transaction", result.tx.txHash);
  }

  async function selectWinner() {
    if (!rfq) return;
    const result = await handleAction("Select winner", () => client.selectWinner(rfq.id));
    if (!result) return;
    setRfq(result.rfq);
    const winner = result.winner;
    if (winner) {
      setSuppliers((items) => items.map((item) => (item.supplierIndex === winner.supplierIndex ? winner : item)));
    }
    if (result.tx?.txHash) pushLog("Transaction", result.tx.txHash);
  }

  async function evaluateAllSuppliers() {
    if (!rfq || suppliers.length === 0) return;
    const result = await handleAction("Evaluate all suppliers", async () => {
      const evaluated: Supplier[] = [];
      for (const supplier of suppliers) {
        if (supplier.verdict === "PENDING") {
          const response = await client.evaluateSupplier(rfq.id, supplier.supplierIndex);
          evaluated.push(response.supplier);
        } else {
          evaluated.push(supplier);
        }
      }
      return evaluated.sort((a, b) => a.supplierIndex - b.supplierIndex);
    });

    if (!result) return;
    setSuppliers(result);
  }

  async function closeCurrentRfq() {
    if (!rfq) return;
    const result = await handleAction("Close RFQ", () => client.closeRfq(rfq.id));
    if (!result) return;
    setRfq(result.rfq);
    if (result.tx?.txHash) pushLog("Transaction", result.tx.txHash);
  }

  function exportPacket() {
    const packet = {
      project: "ProcureMinds AI Pro",
      generatedAt: new Date().toISOString(),
      runtime,
      rfq,
      suppliers,
      evaluatedCount,
      winner: bestSupplier ?? null,
      logs
    };
    const blob = new Blob([JSON.stringify(packet, null, 2)], { type: "application/json" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `procureminds-rfq-${rfq?.id ?? "draft"}-packet.json`;
    link.click();
    window.URL.revokeObjectURL(url);
    pushLog("Export packet", link.download);
  }

  const evaluatedCount = suppliers.filter((s) => s.verdict !== "PENDING").length;
  const bestSupplier = suppliers.find((s) => s.supplierIndex === rfq?.winner);
  const pendingCount = suppliers.length - evaluatedCount;

  return (
    <main className="shell">
      <nav className="nav">
        <div className="logo">
          <div className="logo-mark">PM</div>
          <span>ProcureMinds AI Pro</span>
        </div>
        <div className="nav-links">
          <a className="nav-link" href="#rfq">RFQ</a>
          <a className="nav-link" href="#suppliers">Suppliers</a>
          <a className="nav-link" href="#results">Results</a>
          <button className="nav-link nav-button" onClick={refreshState} disabled={Boolean(busy)}>Refresh</button>
        </div>
      </nav>

      <section className="hero">
        <div className="hero-card">
          <div className="eyebrow">GenLayer Intelligent Contract Project</div>
          <h1>AI procurement committee on-chain.</h1>
          <p className="lead">
            Create an RFQ, submit supplier website/proposal URLs, let a GenLayer Intelligent Contract read web evidence, score vendor fit, classify risk, and select the winning supplier with transparent procurement logic.
          </p>
          <div className="hero-actions">
            <a className="btn" href="#rfq">Start RFQ</a>
            <a className="btn secondary" href="https://docs.genlayer.com" target="_blank" rel="noreferrer">GenLayer docs</a>
          </div>
        </div>

        <aside className="status-card hero-card">
          <h2 style={{ margin: 0 }}>Runtime</h2>
          <div className="status-row"><span>Mode</span><strong><span className={runtime.mode === "live" ? "badge live" : "badge"}>{runtime.mode === "setup" ? "SETUP REQUIRED" : runtime.mode.toUpperCase()}</span></strong></div>
          <div className="status-row"><span>Chain</span><strong>{runtime.chain}</strong></div>
          <div className="status-row"><span>Contract</span><strong>{runtime.contractAddress}</strong></div>
          <div className="status-row"><span>Signer</span><strong>{signerAddress || "Not connected"}</strong></div>
          <div className="status-row"><span>Total RFQs</span><strong>{totalRfqs}</strong></div>
          <div className="status-row"><span>Current RFQ</span><strong>{rfq ? `#${rfq.id}` : "None"}</strong></div>
          <form className="load-row" onSubmit={loadRfqById}>
            <input className="input compact" type="number" min="1" value={loadRfqId} onChange={(event) => setLoadRfqId(event.target.value)} placeholder="RFQ id" />
            <button className="btn secondary" disabled={Boolean(busy) || !contractReady}>Load</button>
          </form>
          <div className="action-row">
            <button className="btn secondary" onClick={connectWallet} disabled={Boolean(busy) || !contractReady}>
              {busy === "Connect wallet" ? "Connecting..." : "Connect wallet"}
            </button>
            <button className="btn secondary" onClick={exportPacket} disabled={Boolean(busy)}>Export</button>
          </div>
          {!contractReady && (
            <div className="alert warn">Deploy the GenLayer contract, then set <strong>NEXT_PUBLIC_CONTRACT_ADDRESS</strong> in Vercel to enable live RFQ transactions.</div>
          )}
        </aside>
      </section>

      <section className="metrics">
        <div className="metric"><span>RFQ status</span><strong>{rfq?.status ?? "Not created"}</strong></div>
        <div className="metric"><span>Suppliers</span><strong>{suppliers.length}</strong></div>
        <div className="metric"><span>Evaluated</span><strong>{evaluatedCount}</strong></div>
        <div className="metric"><span>Pending</span><strong>{pendingCount}</strong></div>
        <div className="metric"><span>Winner</span><strong>{bestSupplier?.name ?? "Pending"}</strong></div>
      </section>

      <section className="workspace">
        <div className="stack">
          <form className="panel form" id="rfq" onSubmit={createRfq}>
            <h2>Create RFQ</h2>
            <p className="help">This writes <strong>create_rfq</strong> to the contract in live mode.</p>
            <div className="field">
              <label>Title</label>
              <input className="input" value={rfqForm.title} onChange={(e) => setRfqForm({ ...rfqForm, title: e.target.value })} />
            </div>
            <div className="field">
              <label>Requirements</label>
              <textarea className="textarea" value={rfqForm.requirements} onChange={(e) => setRfqForm({ ...rfqForm, requirements: e.target.value })} />
            </div>
            <div className="field">
              <label>Evaluation criteria</label>
              <textarea className="textarea" value={rfqForm.evalCriteria} onChange={(e) => setRfqForm({ ...rfqForm, evalCriteria: e.target.value })} />
            </div>
            <div className="field">
              <label>Budget cents</label>
              <input className="input" type="number" value={rfqForm.budgetCents} onChange={(e) => setRfqForm({ ...rfqForm, budgetCents: Number(e.target.value) })} />
            </div>
            <button className="btn" disabled={Boolean(busy) || !contractReady}>{busy === "Create RFQ" ? "Creating..." : "Create RFQ"}</button>
          </form>

          <form className="panel form" id="suppliers" onSubmit={submitSupplier}>
            <h2>Submit Supplier</h2>
            <p className="help">Supplier website/proposal URLs become inputs for GenLayer web rendering and LLM consensus.</p>
            <div className="field"><label>Name</label><input className="input" value={supplierForm.name} onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })} /></div>
            <div className="field"><label>Website URL</label><input className="input" value={supplierForm.websiteUrl} onChange={(e) => setSupplierForm({ ...supplierForm, websiteUrl: e.target.value })} /></div>
            <div className="field"><label>Proposal URL</label><input className="input" value={supplierForm.proposalUrl} onChange={(e) => setSupplierForm({ ...supplierForm, proposalUrl: e.target.value })} /></div>
            <div className="field"><label>Price cents</label><input className="input" type="number" value={supplierForm.priceCents} onChange={(e) => setSupplierForm({ ...supplierForm, priceCents: Number(e.target.value) })} /></div>
            <div className="field"><label>Claims</label><textarea className="textarea" value={supplierForm.claims} onChange={(e) => setSupplierForm({ ...supplierForm, claims: e.target.value })} /></div>
            <button className="btn" disabled={Boolean(busy) || !contractReady || !rfq}>{busy === "Submit supplier" ? "Submitting..." : "Submit Supplier"}</button>
          </form>
        </div>

        <div className="stack" id="results">
          <div className="panel">
            <h2>Procurement workflow</h2>
            <div className="timeline">
              <div className="step"><div className="step-no">1</div><div><strong>RFQ created</strong><p>Buyer stores requirements, scoring criteria, budget, and status.</p></div></div>
              <div className="step"><div className="step-no">2</div><div><strong>Suppliers submitted</strong><p>Each vendor submits website/proposal URL, pricing, and claims.</p></div></div>
              <div className="step"><div className="step-no">3</div><div><strong>GenLayer evaluation</strong><p>Contract fetches web evidence, calls LLM, validators independently verify the decision fields.</p></div></div>
              <div className="step"><div className="step-no">4</div><div><strong>Winner selected</strong><p>Deterministic tie-breakers select by score, risk, then price.</p></div></div>
            </div>
            {error && <p className="alert warn" style={{ marginTop: 14 }}>{error}</p>}
          </div>

          <div className="panel">
            <div className="card-top">
              <div>
                <h2>Supplier scorecards</h2>
                <p className="help">Click Evaluate for each supplier, then select the winner.</p>
              </div>
              <div className="split-actions">
                <button className="btn secondary" onClick={evaluateAllSuppliers} disabled={Boolean(busy) || !contractReady || !rfq || pendingCount === 0 || rfq.status !== "OPEN"}>
                  {busy === "Evaluate all suppliers" ? "Evaluating..." : "Evaluate all"}
                </button>
                <button className="btn" onClick={selectWinner} disabled={Boolean(busy) || !contractReady || !rfq || evaluatedCount === 0 || rfq.status !== "OPEN"}>{busy === "Select winner" ? "Selecting..." : "Select winner"}</button>
              </div>
            </div>

            {suppliers.length === 0 ? (
              <div className="empty">No suppliers yet. Create an RFQ and submit a supplier.</div>
            ) : (
              <div className="supplier-grid">
                {suppliers.map((supplier) => (
                  <article className="supplier-card" key={supplier.supplierIndex}>
                    <div className="card-top">
                      <div>
                        <h3 className="supplier-title">#{supplier.supplierIndex} {supplier.name}</h3>
                        <p className="meta">{supplier.websiteUrl}</p>
                        <p className="meta">Price: {dollars(supplier.priceCents)}</p>
                      </div>
                      <span className={supplier.verdict === "APPROVED" ? "badge live" : supplier.verdict === "REJECTED" ? "badge warn" : "badge"}>{supplier.verdict}</span>
                    </div>

                    <div className="score-line"><div className="score-fill" style={{ width: `${supplier.score}%` }} /></div>
                    <div className="card-top" style={{ marginTop: 10 }}>
                      <strong>Score {supplier.score}/100</strong>
                      <span className={riskClass(supplier.risk)}>Risk {supplier.risk}</span>
                    </div>

                    <div className="scorecard">
                      <div className="scorebox"><span>Fit</span><strong>{supplier.requirementsFit}</strong></div>
                      <div className="scorebox"><span>Cred</span><strong>{supplier.credibility}</strong></div>
                      <div className="scorebox"><span>Delivery</span><strong>{supplier.deliveryCapability}</strong></div>
                      <div className="scorebox"><span>Price</span><strong>{supplier.priceReasonableness}</strong></div>
                      <div className="scorebox"><span>Risk Ctrl</span><strong>{supplier.riskControl}</strong></div>
                    </div>

                    <p className="result-text"><strong>Reason:</strong> {supplier.reason}</p>
                    {supplier.evidence && <p className="result-text"><strong>Evidence:</strong> {supplier.evidence}</p>}
                    {supplier.redFlags && <p className="result-text"><strong>Red flags:</strong> {supplier.redFlags}</p>}
                    {rfq?.winner === supplier.supplierIndex && <p className="alert">Winner selected for this RFQ.</p>}
                    <button className="btn secondary" onClick={() => evaluateSupplier(supplier.supplierIndex)} disabled={Boolean(busy) || !contractReady || rfq?.status !== "OPEN"}>
                      {busy === `Evaluate supplier #${supplier.supplierIndex}` ? "Waiting for consensus..." : "Evaluate supplier"}
                    </button>
                  </article>
                ))}
              </div>
            )}
          </div>

          <div className="panel">
            <div className="card-top">
              <h2>Current RFQ</h2>
              <button className="btn secondary" onClick={closeCurrentRfq} disabled={Boolean(busy) || !contractReady || !rfq || rfq.status !== "OPEN"}>
                {busy === "Close RFQ" ? "Closing..." : "Close RFQ"}
              </button>
            </div>
            {rfq ? (
              <div>
                <p className="result-text"><strong>#{rfq.id} {rfq.title}</strong></p>
                <p className="result-text"><strong>Budget:</strong> {dollars(rfq.budgetCents)} &middot; <strong>Status:</strong> {rfq.status} &middot; <strong>Suppliers:</strong> {rfq.supplierCount}</p>
                <p className="result-text"><strong>Summary:</strong> {rfq.evaluationSummary}</p>
              </div>
            ) : <div className="empty">RFQ data will appear here.</div>}
          </div>

          <div className="panel">
            <h2>Transaction log</h2>
            <div className="logbox">{logs.map((log, i) => <div key={`${log}-${i}`}>{log}</div>)}</div>
            <p className="footer-note">Live mode waits for finalized transactions and then reads accepted contract state. Always check execution status in GenLayer Studio/Explorer before submitting final links.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
