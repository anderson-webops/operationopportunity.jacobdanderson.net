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
	try {
		// Optionally, choose only one quote:
		// const res = await fetch("/api/quotes?tags=success&limit=1");
		// const [q]  = await res.json();          // destructure first item

		const res = await fetch("/api/quotes?tags=success&limit=100");
		if (!res.ok) {
			console.error("Backend error", await res.text());
			return;
		}
		const data = (await res.json()) as Quote[];

		try {
			if (data.length) {
				quoteText.value = data[0].content;
				quoteAuthor.value = data[0].author;
				quotePresent.value = true;
			}
		} catch (e) {
			console.warn("No quote retrieved:", data[0], e);
			quotePresent.value = false;
		}
	} catch (err) {
		console.error("Quote fetch failed:", err);
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
		<div v-if="quotePresent" class="quote mt-3">
			<q>{{ quoteText }}</q>
			<br />
			<q>
				<span>- {{ quoteAuthor }}</span></q
			>
		</div>

		<img
			alt="Tutor helping college student"
			class="m-5"
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
span {
	font-family: cursive;
	margin-left: 30px;
}

.quote {
	text-align: left;
	width: 50%;
	margin: 0 auto;
	background-color: whitesmoke;
}

q {
	font-style: italic;
}

@media only screen and (max-width: 960px) {
	.quote {
		width: 80%;
	}
}
</style>
