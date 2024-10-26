import {
	MapContainer,
	Marker,
	Popup,
	TileLayer,
	GeoJSON,
	useMapEvents,
} from "react-leaflet";
import type { FeatureCollection, Feature, Geometry } from "geojson";
import _auroraRawData from "../../data/ovation_aurora_latest.json";
import {
	SyntheticEvent,
	useEffect,
	useLayoutEffect,
	useMemo,
	useReducer,
	useRef,
	useState,
} from "react";
import { css } from "@emotion/css";
import globeIconPath from "../../graphics/globe-icon.png";
import { LatLng, Icon } from "leaflet";
import { assertNever } from "../../shared/assertNever";

import {
	Autocomplete,
	Collapse,
	Drawer,
	IconButton,
	InputAdornment,
	SwipeableDrawer,
	TextField,
} from "@mui/material";
import { ReactComponent as NoCloudIcon } from "../../graphics/no-cloud.svg";
import { ReactComponent as SunIcon } from "../../graphics/sun.svg";
import { ReactComponent as MoonIcon } from "../../graphics/moon.svg";
import { ReactComponent as SunriseIcon } from "../../graphics/sunrise.svg";
import { ReactComponent as SunsetIcon } from "../../graphics/sunset.svg";
import { ReactComponent as XCircleIcon } from "../../graphics/x-circle.svg";
import { ReactComponent as ChevronExpandIcon } from "../../graphics/chevron-expand.svg";
import { ReactComponent as ChevronCollapseIcon } from "../../graphics/chevron-collapse.svg";
import { ReactComponent as PinIcon } from "../../graphics/pin.svg";
import PinIconPath from "../../graphics/pin.png";

const lastUpdated = _auroraRawData["Observation Time"];
const forecastTime = _auroraRawData["Forecast Time"];

const mapUrl = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png";
// const mapUrl = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"

const colors = [
	"(10, 7, 135)",
	"(10, 10, 137)",
	"(11, 13, 139)",
	"(11, 15, 141)",
	"(12, 18, 144)",
	"(13, 21, 146)",
	"(13, 24, 148)",
	"(13, 24, 148)",
	"(15, 29, 152)",
	"(15, 32, 154)",
	"(16, 35, 156)",
	"(16, 35, 156)",
	"(17, 38, 158)",
	"(17, 41, 160)",
	"(18, 44, 162)",
	"(19, 47, 164)",
	"(20, 50, 166)",
	"(21, 53, 167)",
	"(22, 56, 169)",
	"(23, 59, 171)",
	"(24, 63, 174)",
	"(26, 73, 178)",
	"(30, 83, 182)",
	"(33, 93, 187)",
	"(35, 102, 191)",
	"(39, 112, 195)",
	"(42, 122, 200)",
	"(45, 132, 203)",
	"(48, 142, 207)",
	"(52, 152, 211)",
	"(55, 161, 216)",
	"(58, 171, 220)",
	"(62, 181, 224)",
	"(65, 191, 229)",
	"(69, 201, 233)",
	"(72, 211, 237)",
	"(75, 221, 241)",
	"(79, 229, 245)",
	"(82, 239, 249)",
	"(85, 249, 253)",
	"(88, 255, 251)",
	"(90, 255, 237)",
	"(92, 255, 224)",
	"(96, 255, 210)",
	"(102, 255, 197)",
	"(108, 255, 183)",
	"(115, 255, 170)",
	"(123, 255, 156)",
	"(132, 255, 142)",
	"(132, 255, 142)",
	"(151, 255, 113)",
	"(161, 255, 98)",
	"(161, 255, 98)",
	"(172, 255, 82)",
	"(182, 255, 65)",
	"(193, 255, 47)",
	"(203, 255, 19)",
	"(215, 255, 0)",
	"(226, 255, 0)",
	"(237, 255, 0)",
	"(249, 254, 0)",
	"(253, 246, 0)",
	"(252, 233, 0)",
	"(250, 221, 0)",
	"(249, 208, 0)",
	"(248, 195, 0)",
	"(248, 182, 0)",
	"(246, 169, 0)",
	"(245, 156, 0)",
	"(245, 143, 0)",
	"(244, 130, 0)",
	"(243, 117, 0)",
	"(243, 104, 0)",
	"(242, 91, 0)",
	"(242, 78, 0)",
	"(241, 64, 0)",
	"(241, 50, 0)",
	"(240, 36, 0)",
	"(240, 20, 0)",
	"(239, 0, 0)",
	"(239, 0, 0)",
	"(234, 0, 0)",
	"(229, 0, 0)",
	"(223, 0, 0)",
	"(217, 0, 0)",
	"(210, 0, 0)",
	"(205, 0, 0)",
	"(199, 0, 0)",
	"(193, 0, 0)",
	"(187, 0, 0)",
	"(182, 0, 0)",
	"(182, 0, 0)",
	"(175, 0, 0)",
	"(163, 0, 0)",
	"(163, 0, 0)",
	"(158, 0, 0)",
	"(152, 0, 0)",
	"(146, 0, 0)",
	"(139, 0, 0)",
	"(134, 0, 0)",
];

const getEaseOutPercent = ({ percent }: { percent: number }) => {
	return percent ** 0.5;
};

const getColorFromPercent = ({ percent }: { percent: number }) => {
	const colorIndex = Math.round(
		getEaseOutPercent({ percent }) * (colors.length - 1)
	);
	return `rgb${colors[colorIndex]}`;
};

const getCoordStr = ({ lat, long }: { lat: number; long: number }) =>
	`${lat},${long}`;

const getBoundedValue = ({
	value,
	min,
	max,
}: {
	value: number;
	min: number;
	max: number;
}) => {
	if (value < min) {
		return min;
	}
	if (value > max) {
		return max;
	}
	return value;
};

type FeatureProperties = {
	name: string;
	aurora: number;
	lat: number;
	long360: number;
};

const auroraGeoJsonData = (() => {
	let maxLat = -1000;
	let minLat = 1000;
	let maxLong = -1000;
	let minLong = 1000;

	const coordsAndAurora = _auroraRawData.coordinates.reduce<
		{ long360: number; lat: number; aurora: number }[]
	>((prev, coords) => {
		const [long360, lat, aurora] = coords;
		maxLat = Math.max(maxLat, lat);
		minLat = Math.min(minLat, lat);
		maxLong = Math.max(maxLong, long360);
		minLong = Math.min(minLong, long360);

		if (aurora && Math.abs(lat) > 1) {
			prev.push({ long360, lat, aurora }); // filter out coordinates with no aurora
		}
		return prev;
	}, []);

	console.log({ maxLat, minLat, maxLong, minLong });

	const geoJsonData: FeatureCollection = {
		type: "FeatureCollection",
		features: coordsAndAurora.map(({ long360, lat, aurora }, index) => ({
			type: "Feature",
			id: index.toString(),
			properties: {
				name: getCoordStr({ lat, long: long360 }),
				aurora,
				lat,
				long360,
			} satisfies FeatureProperties,
			geometry: {
				type: "Polygon",
				coordinates: [
					[
						[-0.5, 0.5],
						[0.5, 0.5],
						[0.5, -0.5],
						[-0.5, -0.5],
					].map(([dx, dy]) => {
						const lat180 = long360 > 180 ? long360 - 360 : long360;
						const newLong = getBoundedValue({
							value: lat180 + dy,
							min: -180,
							max: 179, // TODO: should be 180?
						});
						const newLat = getBoundedValue({
							value: lat + dx,
							min: -90,
							max: 90, // TODO: should be 89?
						});
						return [newLong, newLat];
					}),
				],
			},
		})),
	};

	return geoJsonData;
})();

/*
			<div>
				{Array.from(Array(100)).map((_, i) => (
					<div
						style={{
							backgroundColor: getColorFromPercent({
								percent: i / 100,
							}),
							width: 10,
							height: 1,
						}}
					></div>
				))}
			</div>
*/

type State = {
	isDrawerOpen: boolean;
	position: null | LatLng;
	isDrawerExpanded: boolean;
};

type Action =
	| { type: "expandDrawer" }
	| { type: "shrinkDrawer" }
	| { type: "closeDrawer" }
	| { type: "pickLocation"; newPosition: LatLng };

export const AuroraMap = ({
	nightDatas,
	sunPosition = [0, 0],
}: {
	nightDatas?: Feature[];
	sunPosition?: [number, number];
}) => {
	const [state, dispatch] = useReducer<
		(state: State, action: Action) => State
	>(
		(state, action) => {
			switch (action.type) {
				case "expandDrawer": {
					if (state.isDrawerOpen) {
						return {
							...state,
							isDrawerExpanded: true,
							isDrawerOpen: true,
						};
					}
					return { ...state };
				}
				case "shrinkDrawer":
					return {
						...state,
						isDrawerExpanded: false,
					};
				case "closeDrawer":
					return {
						...state,
						isDrawerOpen: false,
						position: null,
					};
				case "pickLocation":
					return {
						...state,
						isDrawerOpen: true,
						isDrawerExpanded: true,
						position: action.newPosition,
					};
				default:
					return assertNever(action, "action");
			}
		},
		{
			isDrawerOpen: false,
			position: null,
			isDrawerExpanded: false,
		}
	);

	const auroraChance = useMemo(() => {
		if (!state.position) {
			return 0;
		}
		return getAuroraValue(state.position, auroraGeoJsonData as any) ?? 0;
	}, [state.position?.lat, state.position?.lng]);

	return (
		<div
			className={css`
				position: relative;
			`}
		>
			<div
				className={css`
					position: absolute;
					left: 0;
					right: 0;
					margin: 0 auto;
					top: 1.5rem;
					margin: 0 auto;
					z-index: 401;
					width: calc(100vw - 3rem);
					max-width: 500px;
				`}
			>
				<Autocomplete
					disablePortal
					options={[
						"Toronto, Ontario, Canada",
						"London, United Kingdom",
						"Luxenburg, Germany",
					]}
					sx={{
						" .MuiFormControl-root": {
							borderRadius: "1000px",
							backgroundColor: "#334155",
							border: "none",
							boxShadow: "0px 4px 10px rgba(0,0,0,0.5)",
						},
						" .MuiOutlinedInput-notchedOutline": {
							borderRadius: "1000px",
							"&:not(:hover)": {
								borderColor: "transparent",
							},
						},
					}}
					renderInput={(params) => (
						<TextField
							{...params}
							InputProps={{
								...params.InputProps,

								startAdornment: (
									<>
										<InputAdornment position="start">
											<img
												style={{ marginLeft: "0.5rem" }}
												src={globeIconPath}
												alt="globe"
												height={24}
												width={24}
											/>
										</InputAdornment>
										{params.InputProps.startAdornment}
									</>
								),
							}}
							placeholder="Search for a place"
						/>
					)}
					{
						/*slotProps={
						{
							/*paper: {
							sx: {
								borderRadius: "1000px",
								padding: "0.65rem 0.75rem",
								backgroundColor: "#334155",
								border: "none",
								boxShadow: "0px 4px 10px rgba(0,0,0,0.5)",
							},
						},
						/*input: {
							sx: {
								color: "white",
								"&::placeholder": {
									color: "#E2E8F0",
									opacity: 1,
								},
								fontSize: "1.125rem",
							},
						},
						popupIndicator: {
							sx: { display: "none" },
						},
					}*/
						...{}
					}
				/>
			</div>

			<MapContainer
				style={{
					height: document.body.getBoundingClientRect().height,
					backgroundColor: "#121212",
				}}
				zoomControl={false}
				center={[51.505, -0.09]}
				zoom={13}
				scrollWheelZoom={true}
			>
				<TileLayer
					attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
					url={mapUrl}
					noWrap
				/>
				{nightDatas &&
					nightDatas.map((nightData, i) => (
						<GeoJSON
							data={nightData}
							style={(feature) => {
								if (!feature) {
									return {};
								}
								return {
									fillColor: "white",
									weight: 0,
									color: "white",
									opacity: 0.5,
									fillOpacity: 0.1,
									className: "disablePointerEvents",
								};
							}}
							key={i + (nightData as any).coordinates[0][5][0]}
						/>
					))}
				<GeoJSON
					attribution="&copy; NOAA"
					data={auroraGeoJsonData}
					{
						/*onEachFeature={(feature, layer) => {
						layer.on({
							click: (e) => {
								var layer = e.target;
								console.log({ layer });
							},
							mouseover: (e) => {
								var layer = e.target;

								layer.setStyle({
									weight: 5,
									color: "#666",
									dashArray: "",
									fillOpacity: 0.7,
								});

								console.log({ layer });

								layer.bringToFront();
							},
						});
					}}*/ ...{}
					}
					style={(feature) => {
						if (!feature) {
							return {};
						}
						const { aurora } =
							feature.properties as FeatureProperties;
						const percent = getEaseOutPercent({
							percent: aurora / 100,
						}); // TODO: should be 100%
						return {
							fillColor: (() => {
								const colorIndex = Math.round(
									percent * (colors.length - 1)
								);
								return `rgb${colors[colorIndex]}`;
							})(),
							weight: 0,
							opacity: 1,
							fillOpacity: 0.2 + percent * 0.5,
						};
					}}
				/>
				<LocationMarker
					position={state.position}
					onPickPosition={(newPosition: LatLng) =>
						dispatch({ type: "pickLocation", newPosition })
					}
				/>
			</MapContainer>
			<Drawer
				variant="persistent"
				open={state.isDrawerOpen}
				hideBackdrop
				anchor={"bottom"}
				onClose={() => dispatch({ type: "closeDrawer" })}
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
				onClick={() =>
					dispatch({
						type: state.isDrawerExpanded
							? "shrinkDrawer"
							: "expandDrawer",
					})
				}
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
								{state.isDrawerExpanded ? (
									<ChevronCollapseIcon />
								) : (
									<ChevronExpandIcon />
								)}
							</div>
							<div
								style={{
									position: "absolute",
									right: "-0.5rem",
									top: "2px",
									height: "22px",
									zIndex: 10_000,
								}}
								onClick={(e) => {
									e.preventDefault(); // don't propagate events
									dispatch({ type: "closeDrawer" });
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
							{state.position
								? getCoordinateDisplayStr(state.position)
								: null}
						</h3>
					</div>
					<Collapse
						in={state.isDrawerExpanded}
						timeout="auto"
						unmountOnExit
					>
						<div style={{ paddingBottom: "2.5rem" }}>
							<h2 style={{ margin: 0, fontSize: "24px" }}>
								Toronto
							</h2>
							<h3
								style={{
									margin: 0,
									fontSize: "14px",
									fontWeight: 400,
									color: "#CBD5E1",
								}}
							>
								Ontario, Canada
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
								{state.position && (
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
									<div
										style={{
											display: "flex",
											alignItems: "center",
											gap: "0.5rem",
										}}
									>
										<NoCloudIcon />
										<p style={{ margin: 0 }}>
											<span>32%</span> <span>Low</span>
										</p>
									</div>
									<div
										style={{
											display: "flex",
											alignItems: "center",
											gap: "0.5rem",
										}}
									>
										{(() => {
											const { lng, lat } =
												state.position ?? {
													lng: 0,
													lat: 0,
												};
											const daylightLevel =
												getDaylightLevel(sunPosition, [
													lng,
													lat,
												]);
											const { icon, displayText } =
												(() => {
													switch (daylightLevel) {
														case "DAY":
															return {
																icon: (
																	<SunIcon />
																),
																displayText:
																	"Day",
															};
														case "NIGHT":
															return {
																icon: (
																	<MoonIcon />
																),
																displayText:
																	"Night",
															};
														case "SUNRISE":
															return {
																icon: (
																	<SunriseIcon />
																),
																displayText:
																	"Sunrise",
															};
														case "SUNSET":
															return {
																icon: (
																	<SunsetIcon />
																),
																displayText:
																	"Sunset",
															};
														case "TWILIGHT_DAWN":
															return {
																icon: (
																	<SunriseIcon />
																),
																displayText:
																	"Twilight",
															};
														case "TWILIGHT_DUSK":
															return {
																icon: (
																	<SunsetIcon />
																),
																displayText:
																	"Twilight",
															};
													}
												})();
											return (
												<>
													{icon}
													<p style={{ margin: 0 }}>
														{displayText}
													</p>
												</>
											);
										})()}
									</div>
								</div>
							</div>
						</div>
					</Collapse>
				</div>
			</Drawer>
		</div>
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

function getAuroraValue(
	latLng: LatLng,
	geoJson: FeatureCollection<Geometry, FeatureProperties>
) {
	const targetLat = Math.round(latLng.lat);
	const targetLong360 = (() => {
		const long180 = Math.round(latLng.lng);
		return long180 < 0 ? long180 + 360 : long180;
	})();

	const doesFeatureMatch = ({ index }: { index: number }) => {
		const { properties } = geoJson.features[index];
		return (
			properties.lat === targetLat && properties.long360 === targetLong360
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
		if (feature.properties.long360 === targetLong360) {
			if (feature.properties.lat === targetLat) {
				return getAurora({ index: midPoint });
			}
			if (feature.properties.lat < targetLat) {
				startBound = midPoint;
			} else {
				endBound = midPoint;
			}
		} else if (feature.properties.long360 < targetLong360) {
			startBound = midPoint;
		} else {
			endBound = midPoint;
		}
	}
	return null;
}

function LocationMarker({
	position,
	onPickPosition,
}: {
	position: LatLng | null;
	onPickPosition: (newPosition: LatLng) => void;
}) {
	const updatePosition = (latlng: LatLng) => {
		//map.panTo(latlng);
		onPickPosition(latlng);
	};
	const map = useMapEvents({
		click(e) {
			console.log(e);
			updatePosition(e.latlng);
		},
		locationfound(e) {
			map.flyTo(e.latlng, map.getZoom());
		},
	});

	return position === null ? null : (
		<Marker
			key={`${position.lat},${position.lng}`}
			position={position}
			icon={
				new Icon({
					iconUrl: PinIconPath,
					iconSize: [27, 33],
					className: "blinking-child",
					iconAnchor: [27 / 2, 33],
				})
			}
		>
			<Popup>You are here</Popup>
		</Marker>
	);
}
