<script lang="ts" setup>
import { onBeforeUnmount, onMounted, ref } from "vue";

defineOptions({ name: "HomePage" });

// Render immediately, including while the API is slow or unavailable.
const quoteText = ref("Success is the sum of small efforts, repeated day in and day out.");
const quoteAuthor = ref("Robert Collier");
const controller = new AbortController();
let timeout: ReturnType<typeof setTimeout> | undefined;

/* -------------- fetcher ---------------- */
async function updateQuote() {
	timeout = setTimeout(() => controller.abort(), 10_000);
	try {
		const res = await fetch("/api/quotes?tags=success&random=true&limit=1", {
			headers: { accept: "application/json" },
			cache: "no-store",
			signal: controller.signal
		});
		if (!res.ok) return;
		const data: unknown = await res.json();
		if (controller.signal.aborted || !Array.isArray(data)) return;
		const quote = data.find(
			(candidate) =>
				candidate &&
				typeof candidate.content === "string" &&
				candidate.content.trim().length > 0 &&
				candidate.content.length <= 10_000 &&
				typeof candidate.author === "string" &&
				candidate.author.trim().length > 0 &&
				candidate.author.length <= 200
		);
		if (!quote) return;
		quoteText.value = quote.content.trim();
		quoteAuthor.value = quote.author.trim();
	} catch {
		// The built-in quote remains available on network and JSON errors.
	} finally {
		clearTimeout(timeout);
	}
}

/* -------------- run once on client -------------- */
onMounted(updateQuote);
onBeforeUnmount(() => {
	clearTimeout(timeout);
	controller.abort();
});
</script>

<template>
	<!-------------
  -   Section   -
  -------------->

	<section class="Home text-center">
		<h1>Operation Opportunity</h1>
		<div aria-label="Inspirational quote" class="quote mt-3" role="note">
			<blockquote class="quote-text">
				<p>{{ quoteText }}</p>
			</blockquote>
			<p class="quote-meta">
				<cite id="quote-author" class="quote-author">
					{{ quoteAuthor }}
				</cite>
			</p>
		</div>

		<h2>Welcome to Operation Opportunity!</h2>
		<p class="mt-3">
			Operation Opportunity is dedicated to helping all students everywhere become ready and prepared for college.
			Starting early on, our priority is to help students develop study and critical thinking skills, aid them
			through the college application process, and make higher education more accessible to everyone.
		</p>
	</section>
</template>

<style scoped>
.quote {
	width: min(100%, 36rem);
	margin: 0 auto 1.5rem;
	padding: 0.65rem 1rem;
	background-color: whitesmoke;
	border-radius: 8px;
	color: #4b5563;
	text-align: left;
}

.quote-text {
	margin: 0;
}

.quote-text p {
	margin: 0;
	font-family: inherit;
	font-size: 1rem;
	line-height: 1.5;
	font-style: italic;
	text-align: left;
	overflow-wrap: anywhere;
}

.quote-meta {
	margin: 0.35rem 0 0 1rem;
	font-size: 0.875rem;
	text-align: left;
}

#quote-author {
	font-style: italic;
	font-weight: 400;
}
</style>
