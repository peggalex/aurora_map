import { MapContainer, Marker, Popup, TileLayer, GeoJSON } from "react-leaflet";
import style from "./index.module.css";
import type { FeatureCollection, Feature } from "geojson";
import _auroraRawData from "../../data/ovation_aurora_latest.json";

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

export const AuroraMap = ({ nightDatas }: { nightDatas?: Feature[] }) => {
	return (
		<>
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
			<MapContainer
				id={style.auroraMap}
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
								};
							}}
							key={i + (nightData as any).coordinates[0][5][0]}
						/>
					))}
				<GeoJSON
					attribution="&copy; NOAA"
					data={auroraGeoJsonData}
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
			</MapContainer>
		</>
	);
};
