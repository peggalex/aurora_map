import {
	Autocomplete,
	TextField,
	InputAdornment,
	debounce,
} from "@mui/material";
import { useMemo, useState, useEffect } from "react";
import globeIconPath from "../../graphics/globe-icon.png";

const locationToStr = (location: AutoCompletedLocation) =>
	[location.name, location.region, location.country]
		.filter((x) => x && x.length > 0)
		.join(", ");

export const LocationSearchDropdown = ({
	value,
	setValue,
}: {
	value: AutoCompletedLocation | null;
	setValue: (newValue: AutoCompletedLocation | null) => void;
}) => {
	const [inputValue, setInputValue] = useState("");
	const [options, setOptions] = useState<AutoCompletedLocations>([]);

	const getAutoCompleteLocationOptions = useMemo(
		() =>
			debounce(async (searchTerm: string) => {
				const options =
					await (async (): Promise<AutoCompletedLocations> => {
						if (searchTerm.length === 0) {
							return [];
						}
						const resp = await fetch(
							`${process.env.REACT_APP_API_URL}/auto-complete-location-search?search_term=${searchTerm}`
						);
						const autoCompletedLocation =
							(await resp.json()) as AutoCompletedLocations;
						return autoCompletedLocation;
					})();
				setOptions(options);
			}, 400),
		[]
	);

	useEffect(() => {
		console.log({ options });
	}, [options]); // TODO: debugging remove !!!

	useEffect(() => {
		getAutoCompleteLocationOptions(inputValue);
	}, [inputValue, getAutoCompleteLocationOptions]);

	return (
		<Autocomplete
			disablePortal
			options={options}
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
			filterOptions={(x) => x}
			autoComplete
			filterSelectedOptions
			value={value}
			noOptionsText="No locations"
			onInputChange={(event, newInputValue, reason) => {
				console.error({ newInputValue, reason }); // TODO: debugging remove !!!
				if (reason === "reset") {
					setInputValue("");
					setValue(null);
					return;
				}
				setInputValue(newInputValue);
			}}
			onChange={(event: any, newValue: AutoCompletedLocation | null) => {
				setValue(newValue);
			}}
			getOptionLabel={(option) =>
				typeof option === "string"
					? option
					: locationToStr(option) ?? ""
			}
			renderOption={(props, option) => {
				const { key, ...otherProps } = props;
				return (
					<li key={key} {...otherProps}>
						{locationToStr(option)}
					</li>
				);
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
	);
};

export type AutoCompletedLocation = {
	name: string | null;
	region: string | null;
	country: string | null;
	lat: number;
	long: number;
};

type AutoCompletedLocations = AutoCompletedLocation[];
