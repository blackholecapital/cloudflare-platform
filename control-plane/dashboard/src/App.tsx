import { useState } from "react";
import "./App.css";

export default function App() {

  const [customer,setCustomer] = useState("");
  const [domain,setDomain] = useState("");
  const [email,setEmail] = useState("");

  return (

    <div className="container">

      <div className="card">

        <h1>☁ Cloudflare Operations Platform</h1>

        <p className="subtitle">
          Customer Onboarding
        </p>

        <label>
          Company Name
        </label>

        <input
          value={customer}
          onChange={(e)=>setCustomer(e.target.value)}
          placeholder="Black Hole Capital"
        />

        <label>
          Domain
        </label>

        <input
          value={domain}
          onChange={(e)=>setDomain(e.target.value)}
          placeholder="blackhole.ai"
        />

        <label>
          Contact Email
        </label>

        <input
          value={email}
          onChange={(e)=>setEmail(e.target.value)}
          placeholder="admin@example.com"
        />

        <h3>Services</h3>

        <div className="checks">

          <label><input type="checkbox" defaultChecked/> Pages</label>

          <label><input type="checkbox" defaultChecked/> Workers</label>

          <label><input type="checkbox" defaultChecked/> D1</label>

          <label><input type="checkbox" defaultChecked/> KV</label>

          <label><input type="checkbox"/> R2</label>

          <label><input type="checkbox"/> AI Concierge</label>

          <label><input type="checkbox"/> Email</label>

          <label><input type="checkbox"/> SMS</label>

          <label><input type="checkbox"/> Voice</label>

        </div>

        <div className="buttons">

          <button>
            Preview Plan
          </button>

          <button className="primary">
            Provision Customer
          </button>

        </div>

      </div>

    </div>

  );

}
