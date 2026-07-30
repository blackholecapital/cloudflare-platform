export default function App() {
  return (
    <main
      style={{
        fontFamily: "Inter, sans-serif",
        maxWidth: "1100px",
        margin: "0 auto",
        padding: "3rem"
      }}
    >
      <h1>☁️ Cloudflare Operations Platform</h1>

      <p>
        Infrastructure control plane for Cloudflare resources.
      </p>

      <hr />

      <h2>Status</h2>

      <table>
        <tbody>
          <tr>
            <td>Workers</td>
            <td>40</td>
          </tr>

          <tr>
            <td>D1</td>
            <td>7</td>
          </tr>

          <tr>
            <td>KV</td>
            <td>5</td>
          </tr>

          <tr>
            <td>Queues</td>
            <td>13</td>
          </tr>

          <tr>
            <td>Pages</td>
            <td>10</td>
          </tr>
        </tbody>
      </table>

      <hr />

      <h2>Upcoming Commands</h2>

      <ul>
        <li>doctor</li>
        <li>inventory</li>
        <li>plan</li>
        <li>apply</li>
      </ul>
    </main>
  );
}
