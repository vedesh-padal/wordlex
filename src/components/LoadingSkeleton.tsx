export function LoadingSkeleton() {
  return (
    <div style={{ animation: "fadeIn 0.3s ease-out" }}>
      <div className="skeleton sk-title" />
      <div className="skeleton sk-subtitle" />
      
      <div className="divider" />
      
      <div style={{ marginBottom: "2rem" }}>
        <div className="skeleton sk-badge" style={{ marginBottom: "1rem" }} />
        {[1, 2, 3].map(i => (
          <div key={i} style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem" }}>
            <div className="skeleton" style={{ width: "1.25rem", height: "1rem" }} />
            <div style={{ flex: 1 }}>
              <div className="skeleton sk-text" />
              <div className="skeleton sk-text-short" />
            </div>
          </div>
        ))}
      </div>

      <div>
        <div className="skeleton sk-badge" style={{ marginBottom: "1rem" }} />
        {[1, 2].map(i => (
          <div key={i} style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem" }}>
            <div className="skeleton" style={{ width: "1.25rem", height: "1rem" }} />
            <div style={{ flex: 1 }}>
              <div className="skeleton sk-text" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
