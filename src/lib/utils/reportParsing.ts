const RESIDENT_MEDIA_KIND = 'resident-media';
const RESIDENT_METADATA_KIND = 'resident-metadata';

export type MediaType = 'image' | 'video';

export type SerializedMediaAttachment = {
	kind: typeof RESIDENT_MEDIA_KIND;
	version: number;
	id: string;
	name: string;
	type: MediaType;
	dataUrl: string;
	size?: number;
};

export type MediaAttachment = {
	id: string;
	name: string;
	type: MediaType;
	url: string;
	size?: number;
};

export type EvidenceBuckets = {
	media: MediaAttachment[];
	text: string[];
};

export type ResidentMetadataPayload = {
	kind: typeof RESIDENT_METADATA_KIND;
	version: number;
	submittedAt: string;
	reporter: {
		name?: string;
		address?: string;
		contact?: string;
		typeOfReport?: string;
	};
	message?: string;
	attachments?: Array<{ id: string; name: string; type: MediaType; size?: number }>;
};

export type ResidentMetadataResult = {
	isStructured: boolean;
	reporter?: ResidentMetadataPayload['reporter'];
	message?: string;
	attachmentsCount: number;
	submittedAt?: string;
	rawNotes: string;
};

function generateId(prefix = 'media') {
	if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
		return crypto.randomUUID();
	}
	return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createMediaAttachmentPayload({
	id,
	name,
	type,
	dataUrl,
	size
}: {
	id?: string;
	name: string;
	type: MediaType;
	dataUrl: string;
	size?: number;
}): SerializedMediaAttachment {
	return {
		kind: RESIDENT_MEDIA_KIND,
		version: 1,
		id: id ?? generateId('attachment'),
		name,
		type,
		dataUrl,
		size
	};
}

export function serializeMediaAttachment(payload: SerializedMediaAttachment): string {
	return JSON.stringify(payload);
}

export function summarizeMediaAttachment(payload: SerializedMediaAttachment) {
	return {
		id: payload.id,
		name: payload.name,
		type: payload.type,
		size: payload.size
	};
}

export function buildResidentMetadata({
	reporter,
	message,
	attachments,
	submittedAt
}: {
	reporter?: ResidentMetadataPayload['reporter'];
	message?: string;
	attachments?: Array<{ id: string; name: string; type: MediaType; size?: number }>;
	submittedAt?: string;
}): string {
	const metadata: ResidentMetadataPayload = {
		kind: RESIDENT_METADATA_KIND,
		version: 1,
		submittedAt: submittedAt ?? new Date().toISOString(),
		reporter: reporter ?? {},
		message,
		attachments
	};
	return JSON.stringify(metadata);
}

function asMediaAttachmentFromString(value: string): MediaAttachment | null {
	if (!value) return null;

	try {
		const parsed = JSON.parse(value);
		if (parsed?.kind === RESIDENT_MEDIA_KIND && typeof parsed.dataUrl === 'string') {
			return {
				id: parsed.id ?? generateId('attachment'),
				name: parsed.name ?? 'Resident Attachment',
				type: parsed.type === 'video' ? 'video' : 'image',
				url: parsed.dataUrl,
				size: parsed.size
			};
		}
	} catch {
		// not json, fall through
	}

	const lower = value.toLowerCase();
	if (lower.startsWith('data:image/')) {
		return {
			id: generateId('image'),
			name: 'Resident Image',
			type: 'image',
			url: value
		};
	}

	if (lower.startsWith('data:video/')) {
		return {
			id: generateId('video'),
			name: 'Resident Video',
			type: 'video',
			url: value
		};
	}

	if (lower.startsWith('http')) {
		const isVideo = /\.(mp4|mov|avi|webm|mkv)(\?|$)/.test(lower);
		const isImage = /\.(png|jpe?g|gif|webp|bmp|svg)(\?|$)/.test(lower);
		if (isVideo || isImage) {
			return {
				id: generateId(isVideo ? 'video' : 'image'),
				name: 'Resident Attachment',
				type: isVideo ? 'video' : 'image',
				url: value
			};
		}
	}

	return null;
}

export function parseEvidenceEntries(evidence: string[] | undefined | null): EvidenceBuckets {
	const buckets: EvidenceBuckets = { media: [], text: [] };
	if (!evidence || !Array.isArray(evidence)) return buckets;

	for (const entry of evidence) {
		if (!entry) continue;
		if (typeof entry !== 'string') {
			buckets.text.push(String(entry));
			continue;
		}
		const media = asMediaAttachmentFromString(entry);
		if (media) {
			buckets.media.push(media);
		} else {
			buckets.text.push(entry);
		}
	}

	return buckets;
}

export function parseResidentMetadata(notes?: string | null): ResidentMetadataResult {
	if (!notes) {
		return {
			isStructured: false,
			attachmentsCount: 0,
			rawNotes: ''
		};
	}

	try {
		const parsed = JSON.parse(notes);
		if (parsed?.kind === RESIDENT_METADATA_KIND) {
			const attachmentsCount = Array.isArray(parsed.attachments) ? parsed.attachments.length : 0;
			return {
				isStructured: true,
				reporter: parsed.reporter ?? {},
				message: parsed.message ?? '',
				attachmentsCount,
				submittedAt: parsed.submittedAt,
				rawNotes: parsed.message ?? ''
			};
		}
	} catch {
		// treat as plain text
	}

	return {
		isStructured: false,
		reporter: undefined,
		message: notes,
		attachmentsCount: 0,
		rawNotes: notes
	};
}

export { RESIDENT_MEDIA_KIND, RESIDENT_METADATA_KIND };

