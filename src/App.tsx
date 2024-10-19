import React, { useState } from "react";
import "./App.css";
import { Chart } from "./components/amchart/chart";
import { AuroraMap } from "./components/aurora-map";

function App() {
	const [useAMCharts, setUseAmCharts] = useState(false);
	return (
		<div className="App">
			<label id="use-am-charts-label">Use AM Charts</label>
			<input
				type="checkbox"
				onChange={(e) => setUseAmCharts(e.target.checked)}
			/>
			{useAMCharts ? <Chart /> : <AuroraMap />}
		</div>
	);
}

export default App;
