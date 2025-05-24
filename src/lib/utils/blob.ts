export function blobToBase64(blob: Blob): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onloadend = () => {
			if (reader.result && typeof reader.result === 'string') {
				resolve(reader.result.split(',')[1]); // Remove "data:..." prefix
			} else {
				reject('Failed to convert blob to base64');
			}
		};
		reader.onerror = reject;
		reader.readAsDataURL(blob);
	});
}

export function base64ToBlob(base64: string, type: string = 'application/octet-stream'): Blob {
	const byteCharacters = atob(base64);
	const byteArrays = [];

	for (let i = 0; i < byteCharacters.length; i += 512) {
		const slice = byteCharacters.slice(i, i + 512);
		const byteNumbers = new Array(slice.length).fill(0).map((_, j) => slice.charCodeAt(j));
		byteArrays.push(new Uint8Array(byteNumbers));
	}

	return new Blob(byteArrays, { type });
}
