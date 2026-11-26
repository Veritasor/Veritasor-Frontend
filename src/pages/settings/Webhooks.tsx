import { useState } from 'react'
import WebhookRetryPanel from '../../components/WebhookRetryPanel'
import WebhookCreateForm from '../../components/webhooks/WebhookCreateForm'
import { type RotatingSecret } from '../../components/WebhookSecretRotationDialog'
import { webhooksStore, useWebhooks } from '../../store/webhooksStore'

function WebhooksPanel() {
  const { endpoints, deliveries } = useWebhooks();
  const [statusFilter, setStatusFilter] = useState<"all" | "delivered" | "failed" | "retrying">("all");
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);
  const [rotation, setRotation] = useState<{
    endpointId: string;
    oldSecret: RotatingSecret;
    newSecret: RotatingSecret;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleCreate(data: { url: string; description: string; events: string[] }) {
    try {
      const created = webhooksStore.createEndpoint(data);
      setCreatedSecret(created.signingSecret);
      setError(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to create webhook endpoint.');
    }
  }

  function handleRetry(id: string) {
    if (!webhooksStore.retryDelivery(id)) return;
    window.setTimeout(() => {
      webhooksStore.completeRetry(id, {
        statusCode: null,
        error: 'Retry transport is not configured in this frontend.',
      });
    }, 1000);
  }

  return (
    <div>
      <h2>Webhooks</h2>
      <p style={{ color: "var(--muted)" }}>
        Manage secure endpoints and review persistent delivery history.
      </p>
      {error && <p role="alert" style={{ color: "var(--danger)" }}>{error}</p>}
      {createdSecret && (
        <div role="status" style={{ marginTop: "1rem", padding: "1rem", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)" }}>
          <strong>Save this signing secret now; it will not be shown again.</strong>
          <p><code>{createdSecret}</code></p>
          <button type="button" className="app-button app-button-secondary" onClick={() => setCreatedSecret(null)}>Dismiss</button>
        </div>
      )}
      <section aria-labelledby="webhook-endpoints-heading" style={{ marginTop: "1.5rem" }}>
        <h3 id="webhook-endpoints-heading">Endpoints</h3>
        <WebhookCreateForm
          existingUrls={endpoints.map((endpoint) => endpoint.url)}
          onSubmit={handleCreate}
        />
        <div style={{ display: "grid", gap: "0.75rem", maxWidth: 900, marginTop: "1.25rem" }}>
          {endpoints.map((endpoint) => (
            <article key={endpoint.id} style={{ padding: "1rem", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)" }}>
              <strong>{endpoint.description || endpoint.url}</strong>
              {endpoint.description && <p style={{ margin: "0.25rem 0", color: "var(--muted)" }}>{endpoint.url}</p>}
              <p style={{ margin: "0.5rem 0", color: "var(--muted)", fontSize: "var(--text-sm)" }}>
                {endpoint.enabled ? "Enabled" : "Disabled"} · {endpoint.events.join(", ")} · Signing secret {endpoint.signingSecretMasked}
              </p>
              {endpoint.previousSecretExpiresAt && (
                <p style={{ color: "var(--muted)", fontSize: "var(--text-sm)" }}>
                  Previous secret valid until <time dateTime={endpoint.previousSecretExpiresAt}>{new Date(endpoint.previousSecretExpiresAt).toLocaleString()}</time>
                </p>
              )}
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="app-button app-button-secondary"
                  disabled={!endpoint.enabled}
                  onClick={() => webhooksStore.disableEndpoint(endpoint.id)}
                >
                  Disable endpoint
                </button>
                <button
                  type="button"
                  className="app-button app-button-secondary"
                  disabled={!endpoint.enabled}
                  onClick={() => {
                    try {
                      setRotation({ endpointId: endpoint.id, ...webhooksStore.rotateSecret(endpoint.id) });
                      setError(null);
                    } catch (reason) {
                      setError(reason instanceof Error ? reason.message : 'Unable to rotate signing secret.');
                    }
                  }}
                >
                  Rotate secret
                </button>
              </div>
            </article>
          ))}
          {endpoints.length === 0 && <p style={{ color: "var(--muted)" }}>No webhook endpoints configured.</p>}
        </div>
      </section>
      <section aria-labelledby="webhook-deliveries-heading" style={{ marginTop: "2rem" }}>
        <h3 id="webhook-deliveries-heading">Delivery history</h3>
        <label htmlFor="webhook-delivery-status">Filter by status</label>{" "}
        <select
          id="webhook-delivery-status"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
        >
          <option value="all">All statuses</option>
          <option value="delivered">Delivered</option>
          <option value="failed">Failed</option>
          <option value="retrying">Retrying</option>
        </select>
      <div
        style={{
          marginTop: "1.5rem",
          maxWidth: 900,
          display: "grid",
          gap: "1rem",
        }}
      >
        {deliveries.filter((delivery) => statusFilter === "all" || delivery.status === statusFilter).map((delivery) => (
          <WebhookRetryPanel
            key={delivery.id}
            delivery={delivery}
            onRetry={handleRetry}
            isRetrying={delivery.status === "retrying"}
          />
        ))}
      </div>
      {deliveries.filter((delivery) => statusFilter === "all" || delivery.status === statusFilter).length === 0 && (
        <p style={{ color: "var(--muted)" }}>No deliveries match this status.</p>
      )}
      </section>
      {rotation && (
        <WebhookSecretRotationDialog
          open
          endpointLabel={endpoints.find((endpoint) => endpoint.id === rotation.endpointId)?.url ?? "Webhook endpoint"}
          oldSecret={rotation.oldSecret}
          newSecret={rotation.newSecret}
          onConfirm={() => setRotation(null)}
          onCancelRotation={() => {
            webhooksStore.cancelRotation(rotation.endpointId);
            setRotation(null);
          }}
          onClose={() => setRotation(null)}
        />
      )}
    </div>
  );
}

export default WebhooksPanel
