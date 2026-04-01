<script lang="ts" setup>
import { onMounted, ref } from "vue";

defineOptions({ name: "HomePage" });

/* ---------------- state ---------------- */
const quotePresent = ref(false);
const quoteText = ref("");
const quoteAuthor = ref("");

/* ---------------- types ---------------- */
// Set and given/managed by backend API (quoteProxy.ts)
interface Quote {
	_id: string;
	content: string;
	author: string;
	tags: string[];
	authorSlug: string;
	length: number;
	dateAdded: string; // ISO-8601 strings from the API
	dateModified: string;
}

/* -------------- fetcher ---------------- */
async function updateQuote() {
	const fallback = {
		content:
			"Success is the sum of small efforts, repeated day in and day out.",
		author: "Robert Collier"
	};

	try {
		const res = await fetch("/api/quotes?tags=success&limit=100");
		if (!res.ok) {
			throw new Error(await res.text());
		}
		const data = (await res.json()) as Quote[];
		const [firstQuote] = data;
		if (!firstQuote?.content || !firstQuote.author) {
			throw new Error("Quotes API returned no usable quote");
		}

		quoteText.value = firstQuote.content;
		quoteAuthor.value = firstQuote.author;
		quotePresent.value = true;
	} catch (err) {
		console.error("Quote fetch failed, using fallback:", err);
		quoteText.value = fallback.content;
		quoteAuthor.value = fallback.author;
		quotePresent.value = true;
	}
}

/* -------------- run once on client -------------- */
onMounted(updateQuote);
</script>

<template>
	<!-------------
  -   Section   -
  -------------->

	<section class="Home text-center">
		<h1>Operation Opportunity</h1>
		<div
			v-if="quotePresent"
			aria-label="Inspirational quote"
			class="quote quote-card mt-4"
			role="note"
		>
			<p class="quote-label">Words to Work By</p>
			<blockquote class="quote-text">
				<p>{{ quoteText }}</p>
			</blockquote>
			<p class="quote-meta">
				<span aria-hidden="true" class="quote-divider" />
				<cite id="quote-author" class="quote-author">
					{{ quoteAuthor }}
				</cite>
			</p>
		</div>

		<img
			alt="Tutor helping college student"
			class="m-5"
			loading="lazy"
			src="https://images.theconversation.com/files/268439/original/file-20190409-2921-1a4uike.jpg?ixlib=rb-1.1.0&q=30&auto=format&w=600&h=398&fit=crop&dpr=2"
			width="30%"
		/>
		<h2>Welcome to Operation Opportunity!</h2>
		<p class="mt-3">
			Operation Opportunity is dedicated to helping all students
			everywhere become ready and prepared for college. Starting early on,
			our priority is to help students develop study and critical thinking
			skills, aid them through the college application process, and make
			higher education more accesible to everyone.
		</p>
	</section>
</template>

<style scoped>
.quote-card {
	text-align: left;
	width: min(100%, 42rem);
	margin: 0 auto;
	padding: 1.5rem 1.75rem;
	border: 1px solid rgba(120, 159, 190, 0.24);
	border-radius: 24px;
	background: linear-gradient(
		145deg,
		rgba(255, 255, 255, 0.96),
		rgba(227, 242, 253, 0.92)
	);
	box-shadow: 0 18px 36px rgba(41, 72, 104, 0.12);
}

.quote-label {
	margin: 0 0 0.85rem;
	color: #557a98;
	font-size: 0.78rem;
	font-family: Verdana, Calibri, Candara, sans-serif;
	font-weight: 700;
	letter-spacing: 0.22em;
	text-transform: uppercase;
}

.quote-text {
	position: relative;
	margin: 0;
	padding-left: 1.35rem;
}

.quote-text::before {
	content: "“";
	position: absolute;
	top: -0.45rem;
	left: 0;
	color: #8db0c8;
	font-size: 3rem;
	line-height: 1;
	font-family: Georgia, "Times New Roman", serif;
}

.quote-text p {
	margin: 0;
	color: #243447;
	font-size: 1.35rem;
	line-height: 1.7;
	text-align: left;
	font-family: "Palatino Linotype", Georgia, serif;
	font-style: italic;
}

.quote-meta {
	display: flex;
	align-items: center;
	gap: 0.8rem;
	margin: 1rem 0 0;
	color: #546474;
}

.quote-divider {
	display: inline-block;
	width: 2.5rem;
	height: 1px;
	background-color: #7ca2bf;
}

#quote-author {
	margin: 0;
	font-style: normal;
	font-size: 0.95rem;
	font-weight: 600;
}

@media only screen and (max-width: 960px) {
	.quote-card {
		padding: 1.2rem 1.1rem;
		border-radius: 20px;
	}

	.quote-text p {
		font-size: 1.12rem;
	}
}
</style>
