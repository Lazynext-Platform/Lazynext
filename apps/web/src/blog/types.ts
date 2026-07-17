/** @module Blog type definitions — Post, Pagination, Author, Category, Tag */
export type Post = {
	/** Unique post identifier. */
	id: string;
	/** URL-safe slug. */
	slug: string;
	/** Post title. */
	title: string;
	/** Markdown or HTML content. */
	content: string;
	/** Short meta description. */
	description: string;
	/** Cover image URL. */
	coverImage: string;
	/** Publication date. */
	publishedAt: Date;
	/** Last update date. */
	updatedAt: Date;
	/** Post authors. */
	authors: {
		/** Author unique identifier. */
		id: string;
		/** Author display name. */
		name: string;
		/** Author avatar URL. */
		image: string;
	}[];
	/** Post category. */
	category: {
		/** Category unique identifier. */
		id: string;
		/** Category URL slug. */
		slug: string;
		/** Category display name. */
		name: string;
	};
	/** Post tags. */
	tags: {
		/** Tag unique identifier. */
		id: string;
		/** Tag URL slug. */
		slug: string;
		/** Tag display name. */
		name: string;
	}[];
	/** Content attribution or null. */
	attribution: {
		/** Attribution name. */
		author: string;
		/** Attribution URL. */
		url: string;
	} | null;
};

/** Type definition for Pagination. */
export type Pagination = {
	/** Items per page limit. */
	limit: number;
	/** Current page number. */
	currpage: number;
	/** Next page number or null. */
	nextPage: number | null;
	/** Previous page number or null. */
	prevPage: number | null;
	/** Total items across all pages. */
	totalItems: number;
	/** Total page count. */
	totalPages: number;
};

/** Type definition for MarblePostList. */
export type MarblePostList = {
	/** List of posts. */
	posts: Post[];
	/** Pagination metadata. */
	pagination: Pagination;
};

/** Type definition for MarblePost. */
export type MarblePost = {
	/** Single post object. */
	post: Post;
};

/** Type definition for Tag. */
export type Tag = {
	/** Unique tag identifier. */
	id: string;
	/** Tag display name. */
	name: string;
	/** URL-safe slug. */
	slug: string;
};

/** Type definition for MarbleTag. */
export type MarbleTag = {
	/** Single tag object. */
	tag: Tag;
};

/** Type definition for MarbleTagList. */
export type MarbleTagList = {
	/** List of tags. */
	tags: Tag[];
	/** Pagination metadata. */
	pagination: Pagination;
};

/** Type definition for Category. */
export type Category = {
	/** Unique category identifier. */
	id: string;
	/** Category display name. */
	name: string;
	/** URL-safe slug. */
	slug: string;
};

/** Type definition for MarbleCategory. */
export type MarbleCategory = {
	/** Single category object. */
	category: Category;
};

/** Type definition for MarbleCategoryList. */
export type MarbleCategoryList = {
	/** List of categories. */
	categories: Category[];
	/** Pagination metadata. */
	pagination: Pagination;
};

/** Type definition for Author. */
export type Author = {
	/** Unique author identifier. */
	id: string;
	/** Author display name. */
	name: string;
	/** Author avatar URL. */
	image: string;
};

/** Type definition for MarbleAuthor. */
export type MarbleAuthor = {
	/** Single author object. */
	author: Author;
};

/** Type definition for MarbleAuthorList. */
export type MarbleAuthorList = {
	/** List of authors. */
	authors: Author[];
	/** Pagination metadata. */
	pagination: Pagination;
};
