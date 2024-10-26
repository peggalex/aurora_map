import React, { useState } from "react";
import "./App.css";
import { Chart } from "./components/amchart/chart";
import { AuroraMap } from "./components/aurora-map";
import { theme } from "./shared/theme";

import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";

function App() {
	return (
		<ThemeProvider theme={theme}>
			<CssBaseline enableColorScheme />
			<Chart />
		</ThemeProvider>
	);
}

export default App;
