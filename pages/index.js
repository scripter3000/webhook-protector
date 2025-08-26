import { useState } from "react";

export default function Home() {
  const [inputWebhook, setInputWebhook] = useState("");
  const [protectedUrl, setProtectedUrl] = useState("");

  const handleProtect = () => {
    // We don’t actually store the input webhook on the client
    // The protected webhook is always the same: /api/send
    setProtectedUrl(window.location.origin + "/api/send");
    setInputWebhook("");
  };

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "100vh",
      fontFamily: "sans-serif"
    }}>
      <h1>🔒 Webhook Protector</h1>

      <input
        type="text"
        placeholder="Paste your Discord webhook here"
        value={inputWebhook}
        onChange={(e) => setInputWebhook(e.target.value)}
        style={{ width: "300px", padding: "10px", margin: "10px" }}
      />

      <button
        onClick={handleProtect}
        style={{ padding: "10px 20px", cursor: "pointer" }}
      >
        Protect
      </button>

      {protectedUrl && (
        <div style={{ marginTop: "20px" }}>
          <p>✅ Your protected webhook:</p>
          <code>{protectedUrl}</code>
        </div>
      )}
    </div>
  );
}
