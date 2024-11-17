import { LatLng } from "leaflet";

import { Collapse, css, Drawer, Slider, Tooltip } from "@mui/material";
import { ReactComponent as NoCloudIcon } from "../../graphics/no-cloud.svg";
import { ReactComponent as OneCloudIcon } from "../../graphics/one-cloud.svg";
import { ReactComponent as TwoCloudsIcon } from "../../graphics/two-clouds.svg";
import * as am5 from "@amcharts/amcharts5";
import am5themes_Animated from "@amcharts/amcharts5/themes/Animated";
import * as am5map from "@amcharts/amcharts5/map";
import * as am5xy from "@amcharts/amcharts5/xy";

import { ReactComponent as SunIcon } from "../../graphics/sun.svg";
import { ReactComponent as EyeIcon } from "../../graphics/eye.svg";
import { ReactComponent as NoEyeIcon } from "../../graphics/no-eye.svg";
import { ReactComponent as MoonIcon } from "../../graphics/moon.svg";
import { ReactComponent as SunriseIcon } from "../../graphics/sunrise.svg";
import { ReactComponent as SunsetIcon } from "../../graphics/sunset.svg";
import { ReactComponent as XCircleIcon } from "../../graphics/x-circle.svg";
import { ReactComponent as ChevronExpandIcon } from "../../graphics/chevron-expand.svg";
import { ReactComponent as ChevronCollapseIcon } from "../../graphics/chevron-collapse.svg";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { FeatureCollection, Geometry } from "geojson";
import { FeatureProperties } from "../../shared/types/feature-properties";
import { getColorFromPercent } from "../../shared/get-color-from-percent";

export const LocationDrawer = ({
	isDrawerOpen,
	isDrawerExpanded,
	currentAuroraForecastTime,
	auroraGeoJsonData,
	position,
	sunPosition,
	closeDrawer,
	toggleDrawerExpanded,
}: {
	isDrawerOpen: boolean;
	isDrawerExpanded: boolean;
	currentAuroraForecastTime: Date;
	auroraGeoJsonData: any;
	position: LatLng;
	sunPosition: [number, number];
	closeDrawer: () => void;
	toggleDrawerExpanded: () => void;
}) => {
	const [weatherData, setWeatherData] = useState<WeatherForecast | null>(
		null
	);
	useEffect(() => {
		const url = new URL(
			`${process.env.REACT_APP_API_URL}/get-current-weather-forecast`
		);
		url.searchParams.append("latitude", position.lat.toString());
		url.searchParams.append("longitude", position.lng.toString());
		setWeatherData(null);
		fetch(url).then(async (resp) => {
			const data = await resp.json();
			setWeatherData(data ?? null);
		});
	}, [position]);

	const [forecastTimeSeries, setForecastTimeSeries] =
		useState<AuroraForecastTimeSeries | null>(null);
	useEffect(() => {
		const url = new URL(
			`${process.env.REACT_APP_API_URL}/aurora-chance-for-location`
		);
		url.searchParams.append("lat", position.lat.toString());
		url.searchParams.append("long", position.lng.toString());
		url.searchParams.append(
			"timestamp",
			currentAuroraForecastTime.toISOString()
		);
		setForecastTimeSeries(null);
		fetch(url).then(async (resp) => {
			const data = await resp.json();
			setForecastTimeSeries(data ?? null);
		});
	}, [position]);

	const auroraChance = useMemo(() => {
		return getAuroraValue(position, auroraGeoJsonData as any) ?? 0;
	}, [auroraGeoJsonData, position]);

	const moveCursorRef = useRef((percentX: number) => {});

	useLayoutEffect(() => {
		let root = am5.Root.new("chartdiv");

		root.setThemes([am5themes_Animated.new(root)]);

		let chart = root.container.children.push(
			am5xy.XYChart.new(root, {
				panY: false,
				layout: root.verticalLayout,
			})
		);

		chart
			.get("colors")!
			.set("colors", [
				am5.color("#FFFFFF"),
				am5.color("#FFFFFF"),
				am5.color("#FFFFFF"),
				am5.color("#FFFFFF"),
				am5.color("#FFFFFF"),
			]);

		// Create Y-axis
		let yAxis = chart.yAxes.push(
			am5xy.ValueAxis.new(root, {
				numberFormat: "#'%'",
				min: 0,
				max: 100,
				renderer: am5xy.AxisRendererY.new(root, {
					fill: am5.color("#FFFFFF"),
					stroke: am5.color("#FFFFFF"),
					minGridDistance: 100,
				}),
			})
		);
		yAxis.get("renderer").labels.template.setAll({
			fill: am5.color("#FFFFFF"),
			paddingRight: 10,
		});
		yAxis.get("renderer").grid.template.setAll({
			//strokeWidth: 0,
			visible: false,
		});

		// Create X-Axis
		let xAxis = chart.xAxes.push(
			am5xy.DateAxis.new(root, {
				renderer: am5xy.AxisRendererX.new(root, {}),
				baseInterval: {
					timeUnit: "minute",
					count: 1,
				},
			})
		);
		xAxis.get("renderer").labels.template.setAll({
			fill: am5.color("#FFFFFF"),
			paddingTop: 10,
		});
		xAxis.get("renderer").grid.template.setAll({
			//strokeWidth: 0,
			visible: false,
		});

		let series = chart.series.push(
			am5xy.LineSeries.new(root, {
				name: "Series",
				xAxis: xAxis,
				yAxis: yAxis,
				valueYField: "auroraChance",
				valueXField: "timestamp",
				fill: am5.color("#FFFFFF"),
				stroke: am5.color("#09CD89"),
				background: am5.RoundedRectangle.new(root, {
					fill: am5.color("#0f172a"),
					fillOpacity: 0.2,
					cornerRadiusBL: 10,
					cornerRadiusBR: 10,
					cornerRadiusTL: 10,
					cornerRadiusTR: 10,
				}),
				tooltip: am5.Tooltip.new(root, {}),
			})
		);

		series.data.setAll(forecastTimeSeries?.forecast ?? []);
		series.get("tooltip")!.label.set("text", "{valueY}%");

		xAxis.set(
			"tooltip",
			am5.Tooltip.new(root, {
				themeTags: ["axis"],
			})
		);
		series.bullets.push(function () {
			return am5.Bullet.new(root, {
				sprite: am5.Circle.new(root, {
					radius: 1,
					fill: series.get("fill"),
					stroke: am5.color("#09CD89"),
					strokeWidth: 2,
				}),
			});
		});

		// Add cursor
		chart.set(
			"cursor",
			am5xy.XYCursor.new(root, {
				snapToSeries: [series],
				snapToSeriesBy: "x",
			})
		);

		moveCursorRef.current = (percentX) => {
			chart.get("cursor")!.setAll({
				positionX: percentX,
				positionY: 0.5,
				alwaysShow: true,
			});
		};

		/*chart.get("cursor")!.events.on("cursormoved",  () => {

		})*/

		chart.get("cursor")!.lineX.setAll({
			stroke: am5.color("#BB428D"),
			strokeDasharray: [],
			strokePattern: am5.LinePattern.new(root, {
				color: am5.color("#BB428D"),
				gap: 0,
			}),
		});
		chart.get("cursor")!.lineY.setAll({
			visible: false,
		});

		return () => {
			root.dispose();
		};
	}, [forecastTimeSeries]);

	return (
		<Drawer
			variant="persistent"
			open={isDrawerOpen}
			hideBackdrop
			anchor={"bottom"}
			onClose={closeDrawer}
			PaperProps={{
				sx: {
					width: "100%",
					maxWidth: 500,
					margin: "0 auto",
					backgroundColor: "#0F172A",
					padding: "1rem 2.5em 0 2.5rem",
					borderRadius: "25px 25px 0 0",
					border: "none",
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
				},
			}}
			onClick={toggleDrawerExpanded}
		>
			<div
				style={{
					width: "100%",
					maxWidth: "400px",
				}}
			>
				<div
					style={{
						display: "flex",
						flexDirection: "column",
					}}
				>
					<div
						style={{
							position: "relative",
							width: "100%",
						}}
					>
						<div
							style={{
								margin: "0 auto",
								width: "fit-content",
							}}
						>
							{isDrawerExpanded ? (
								<ChevronCollapseIcon />
							) : (
								<ChevronExpandIcon />
							)}
						</div>
						<div
							style={{
								position: "absolute",
								right: "-1.75rem",
								top: "2px",
								height: "22px",
								zIndex: 10_000,
								cursor: "pointer",
							}}
							onClick={(e) => {
								e.preventDefault(); // don't propagate events
								closeDrawer();
							}}
						>
							<XCircleIcon />
						</div>
					</div>
					<h3
						style={{
							fontSize: "14px",
							fontWeight: 500,
							margin: 0,
							marginTop: "0.5rem",
							marginBottom: "1rem",
							textAlign: "center",
						}}
					>
						{position ? getCoordinateDisplayStr(position) : null}
					</h3>
				</div>
				<Collapse in={isDrawerExpanded} timeout="auto">
					<div style={{ paddingBottom: "2.5rem" }}>
						<div style={{ display: "flex", gap: "0.5rem" }}>
							<div
								style={{
									display: "flex",
									alignItems: "center",
									gap: "0.75rem",
								}}
							>
								{(() => {
									const { lng, lat } = position ?? {
										lng: 0,
										lat: 0,
									};
									const daylightLevel = getDaylightLevel(
										sunPosition,
										[lng, lat]
									);
									const { icon, displayText } = (() => {
										switch (daylightLevel) {
											case "DAY":
												return {
													icon: (
														<SunIcon
															width={18}
															height={18}
															strokeWidth={1.5}
														/>
													),
													displayText: "Day",
												};
											case "NIGHT":
												return {
													icon: (
														<MoonIcon
															width={18}
															height={18}
															strokeWidth={1.5}
														/>
													),
													displayText: "Night",
												};
											case "SUNRISE":
												return {
													icon: (
														<SunriseIcon
															width={18}
															height={18}
															strokeWidth={1.5}
														/>
													),
													displayText: "Sunrise",
												};
											case "SUNSET":
												return {
													icon: (
														<SunsetIcon
															width={18}
															height={18}
															strokeWidth={1.5}
														/>
													),
													displayText: "Sunset",
												};
											case "TWILIGHT_DAWN":
												return {
													icon: (
														<SunriseIcon
															width={18}
															height={18}
															strokeWidth={1.5}
														/>
													),
													displayText: "Twilight",
												};
											case "TWILIGHT_DUSK":
												return {
													icon: (
														<SunsetIcon
															width={18}
															height={18}
															strokeWidth={1.5}
														/>
													),
													displayText: "Twilight",
												};
										}
									})();
									return (
										<Tooltip title={displayText}>
											{icon}
										</Tooltip>
									);
								})()}
							</div>
							<h2 style={{ margin: 0, fontSize: "24px" }}>
								{weatherData?.location.name ??
									"unknown location"}
							</h2>
						</div>
						<h3
							style={{
								margin: 0,
								fontSize: "14px",
								fontWeight: 400,
								color: "#CBD5E1",
							}}
						>
							{(() => {
								const { region, country } =
									weatherData?.location ?? {};
								const terms = [region, country].filter(
									(x) => !!x
								);
								return terms.join(", ") || "--";
							})()}
						</h3>
						<div
							style={{
								marginTop: "1rem",
								columnGap: "1rem",
								display: "grid",
								gridTemplateColumns: "100px auto",
							}}
						>
							<p
								style={{
									fontSize: "12px",
									fontWeight: 400,
									color: "#CBD5E1",
									margin: 0,
								}}
							>
								Aurora chance
							</p>
							<p
								style={{
									fontSize: "12px",
									fontWeight: 400,
									color: "#CBD5E1",
									margin: 0,
								}}
							>
								Visibility
							</p>
							{position && (
								<div
									style={{
										display: "flex",
										alignItems: "center",
										gap: "0.75rem",
									}}
								>
									<div
										style={{
											marginLeft: "0.25rem",
											width: "6px",
											height: "6px",
											borderRadius: "6px",
											backgroundColor:
												auroraChance === 0
													? "#475569"
													: getColorFromPercent({
															percent:
																auroraChance /
																100,
													  }),
										}}
									></div>
									<p
										style={{
											fontSize: "42px",
											fontWeight: 600,
											margin: 0,
										}}
									>
										{auroraChance}
										<span
											style={{
												fontSize: "18px",
												marginLeft: "0.25rem",
											}}
										>
											%
										</span>
									</p>
								</div>
							)}
							<div
								style={{
									display: "flex",
									flexDirection: "column",
									justifyContent: "space-around",
								}}
							>
								{(() => {
									const { visibilityKm } = weatherData ?? {};
									const visibilityDisplay = visibilityKm
										? Math.round(visibilityKm * 10) / 10
										: "? ";
									return (
										<div
											style={{
												display: "flex",
												alignItems: "center",
												gap: "0.5rem",
											}}
										>
											{(visibilityKm ?? 0) <= 5 ? (
												<NoEyeIcon />
											) : (
												<EyeIcon />
											)}
											<p style={{ margin: 0 }}>
												<span>{visibilityDisplay}</span>
												<span>km</span>
											</p>
										</div>
									);
								})()}
								{(() => {
									const { cloudCoverage } = weatherData ?? {};
									const { label, icon } = (() => {
										if (cloudCoverage == null) {
											return {
												label: "--",
												icon: <OneCloudIcon />,
											};
										}
										if (cloudCoverage < 25) {
											return {
												label: "Low",
												icon: <NoCloudIcon />,
											};
										}
										if (cloudCoverage < 50) {
											return {
												label: "Medium",
												icon: <OneCloudIcon />,
											};
										}
										return {
											label: "High",
											icon: <TwoCloudsIcon />,
										};
									})();
									return (
										<div
											style={{
												display: "flex",
												alignItems: "center",
												gap: "0.5rem",
											}}
										>
											{icon}
											<p style={{ margin: 0 }}>
												{cloudCoverage != null ? (
													<>
														<span>
															{cloudCoverage}%
														</span>
													</>
												) : (
													<span>? %</span>
												)}
											</p>
										</div>
									);
								})()}
							</div>
						</div>
					</div>
					<Slider
						onClick={(e) => {
							e.stopPropagation();
						}}
						min={forecastTimeSeries?.forecast.at(0)?.timestamp}
						max={forecastTimeSeries?.forecast.at(-1)?.timestamp}
						onChange={(event, value) => {
							if (!forecastTimeSeries?.forecast.length) {
								return;
							}
							const min =
								forecastTimeSeries.forecast[0].timestamp;
							const max =
								forecastTimeSeries.forecast.at(-1)!.timestamp;
							const percentX =
								((value as number) - min) / (max - min);
							moveCursorRef.current(percentX);
						}}
					/>
					<div
						style={{
							padding: "1rem",
							backgroundColor: "#1e293b",
							borderRadius: "10px",
							marginBottom: "1rem",
						}}
					>
						<div
							id="chartdiv"
							style={{ width: "100%", height: "300px" }}
						></div>
					</div>
				</Collapse>
			</div>
		</Drawer>
	);
};

type DaylightLevel =
	| "DAY"
	| "NIGHT"
	| "SUNSET"
	| "SUNRISE"
	| "TWILIGHT_DUSK"
	| "TWILIGHT_DAWN";

const getDaylightLevel = (
	sunPosition: [number, number],
	[lng, lat]: [number, number]
): DaylightLevel => {
	const radius = getRadiusBetweenPoints(sunPosition, [lng, lat]);
	const radiusAhead = getRadiusBetweenPoints(sunPosition, [lng + 1, lat]);
	const isEarly = radius > radiusAhead; // radius is approaching sun
	if (radius < 90) {
		if (radius >= 88) {
			return isEarly ? "SUNRISE" : "SUNSET";
		}
		return "DAY";
	} else {
		if (radius <= 92) {
			return isEarly ? "TWILIGHT_DAWN" : "TWILIGHT_DUSK";
		}
		return "NIGHT";
	}
};

function getCoordinateDisplayStr(latLng: LatLng) {
	const displayLong = (() => {
		const lng = Math.round(latLng.lng * 10) / 10;
		return lng < 0 ? `${(-1 * lng).toFixed(1)}° W` : `${lng.toFixed(1)}° E`;
	})();
	const displayLat = (() => {
		const lat = Math.round(latLng.lat * 10) / 10;
		return lat < 0 ? `${(-1 * lat).toFixed(1)}° S` : `${lat.toFixed(1)}° N`;
	})();

	return `${displayLong} ${displayLat}`;
}

function degreesToRadians(degrees: number) {
	return degrees * (Math.PI / 180);
}

function radiansToDegrees(radians: number) {
	return radians / (Math.PI / 180);
}

function getRadiusBetweenPoints(
	[long1, lat1]: [number, number],
	[long2, lat2]: [number, number]
) {
	return radiansToDegrees(
		Math.acos(
			Math.sin(degreesToRadians(lat1)) *
				Math.sin(degreesToRadians(lat2)) +
				Math.cos(degreesToRadians(lat1)) *
					Math.cos(degreesToRadians(lat2)) *
					Math.cos(degreesToRadians(long2) - degreesToRadians(long1))
		)
	); //* 6371
}

export type WeatherForecast = {
	location: {
		name: string | null;
		region: string | null;
		country: string | null;
		latitude: number;
		longitude: number;
	};
	forecastTime: string;
	cloudCoverage: number;
	visibilityKm: number;
};

function getAuroraValue(
	latLng: LatLng,
	geoJson: FeatureCollection<Geometry, FeatureProperties>
) {
	const targetLat = Math.round(latLng.lat);

	const toLong360 = (long180: number) =>
		long180 < 0 ? long180 + 360 : long180;
	const targetLong360 = toLong360(Math.round(latLng.lng));

	const doesFeatureMatch = ({ index }: { index: number }) => {
		const { properties } = geoJson.features[index];
		return (
			properties.lat === targetLat &&
			toLong360(properties.long) === targetLong360
		);
	};

	const getAurora = ({ index }: { index: number }) =>
		geoJson.features[index].properties.aurora;

	let startBound = 0;
	if (doesFeatureMatch({ index: startBound })) {
		return getAurora({ index: startBound });
	}

	let endBound = geoJson.features.length - 1;
	if (doesFeatureMatch({ index: endBound })) {
		return getAurora({ index: endBound });
	}

	while (endBound - startBound > 1) {
		const midPoint = startBound + Math.round((endBound - startBound) / 2);

		const feature = geoJson.features[midPoint];
		if (toLong360(feature.properties.long) === targetLong360) {
			if (feature.properties.lat === targetLat) {
				return getAurora({ index: midPoint });
			}
			if (feature.properties.lat < targetLat) {
				startBound = midPoint;
			} else {
				endBound = midPoint;
			}
		} else if (toLong360(feature.properties.long) < targetLong360) {
			startBound = midPoint;
		} else {
			endBound = midPoint;
		}
	}
	return null;
}

export type AuroraForecastTimeSeries = {
	context: {
		lat: number;
		long: number;
		timestamp: number;
	};
	forecast: {
		auroraChance: number;
		timestamp: number;
	}[];
};
