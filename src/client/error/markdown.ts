/** Keep bold delimiters and their escape characters literal in an error summary. */
export function escapeBoldText(value: string): string {
	return value.replace(/[\\*]/g, '\\$&');
}
