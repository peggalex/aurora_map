import {
	MapContainer,
	Marker,
	Popup,
	TileLayer,
	GeoJSON,
	useMapEvents,
} from "react-leaflet";
import type { Feature } from "geojson";
import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { css } from "@emotion/css";
import { LatLng, Icon, Map as LeafletMap } from "leaflet";
import { assertNever } from "../../shared/assertNever";

import {
	Autocomplete,
	debounce,
	InputAdornment,
	TextField,
} from "@mui/material";
import PinIconPath from "../../graphics/pin.png";
import { LocationDrawer } from "../location-drawer";
import { FeatureProperties } from "../../shared/types/feature-properties";
import { getColorFromPercent } from "../../shared/get-color-from-percent";
import {
	AutoCompletedLocation,
	LocationSearchDropdown,
} from "../location-search-dropdown";

const mapUrl = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png";
// const mapUrl = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"

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

/*
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
*/
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
	searchedLocation: AutoCompletedLocation | null;
};

type Action =
	| { type: "expandDrawer" }
	| { type: "shrinkDrawer" }
	| { type: "closeDrawer" }
	| { type: "pickLocation"; newPosition: LatLng }
	| {
			type: "searchLocation";
			searchedLocation: AutoCompletedLocation | null;
	  };

export const AuroraMap = ({
	nightDatas,
	sunPosition = [0, 0],
}: {
	nightDatas?: Feature[];
	sunPosition?: [number, number];
}) => {
	const mapRef = useRef<LeafletMap | null>(null);

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
				case "searchLocation": {
					if (action.searchedLocation === null) {
						return {
							...state,
							isDrawerOpen: false,
							isDrawerExpanded: false,
							position: null,
							searchedLocation: null,
						};
					}
					const position = new LatLng(
						action.searchedLocation.lat,
						action.searchedLocation.long
					);
					mapRef.current?.panTo(position);
					return {
						...state,
						isDrawerOpen: true,
						isDrawerExpanded: true,
						position,
						searchedLocation: action.searchedLocation,
					};
				}
				case "pickLocation":
					return {
						...state,
						isDrawerOpen: true,
						isDrawerExpanded: true,
						position: action.newPosition,
						searchedLocation: null,
					};
				default:
					return assertNever(action, "action");
			}
		},
		{
			isDrawerOpen: false,
			position: null,
			isDrawerExpanded: false,
			searchedLocation: null,
		}
	);

	const [auroraGeoJsonData, setAuroraGeoJsonData] = useState(null);
	const fetchedCurrentAuroraForecast = useRef(false);
	useEffect(() => {
		if (!fetchedCurrentAuroraForecast.current) {
			fetchedCurrentAuroraForecast.current = true;
			fetch(
				`${process.env.REACT_APP_API_URL}/get-current-aurora-forecast`
			).then(async (resp) => {
				const data = await resp.json();
				setAuroraGeoJsonData(data?.geoJson ?? null);
			});
		}
	}, []);

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
				<LocationSearchDropdown
					value={state.searchedLocation}
					setValue={(
						searchedLocation: AutoCompletedLocation | null
					) => dispatch({ type: "searchLocation", searchedLocation })}
				/>
			</div>

			<MapContainer
				ref={mapRef}
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
				{auroraGeoJsonData && (
					<GeoJSON
						attribution="&copy; NOAA"
						data={auroraGeoJsonData}
						style={(feature) => {
							if (!feature) {
								return {};
							}
							const { aurora } =
								feature.properties as FeatureProperties;
							const percent = aurora / 100;
							return {
								fillColor: getColorFromPercent({
									percent,
								}),
								weight: 0,
								opacity: 1,
								fillOpacity: 0.2 + percent * 0.6,
							};
						}}
					/>
				)}
				<LocationMarker
					position={state.position}
					onPickPosition={(newPosition: LatLng) =>
						dispatch({ type: "pickLocation", newPosition })
					}
				/>
			</MapContainer>
			{state.position && (
				<LocationDrawer
					isDrawerOpen={state.isDrawerOpen}
					isDrawerExpanded={state.isDrawerExpanded}
					auroraGeoJsonData={auroraGeoJsonData}
					position={state.position}
					sunPosition={sunPosition}
					closeDrawer={() => dispatch({ type: "closeDrawer" })}
					toggleDrawerExpanded={() =>
						state.isDrawerExpanded
							? dispatch({ type: "shrinkDrawer" })
							: dispatch({ type: "expandDrawer" })
					}
				/>
			)}
		</div>
	);
};

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
		/*locationfound(e) {
			map.flyTo(e.latlng, map.getZoom());
		},*/
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
