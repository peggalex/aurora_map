export const assertNever = (x: never, variableName: string) => {
	throw Error(`Unexpected ${variableName}: ${x}`);
};
