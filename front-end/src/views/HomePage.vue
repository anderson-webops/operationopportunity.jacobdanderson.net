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
			Operation Opportunity is dedicated to helping all students everywhere
			become ready and prepared for college. Starting early on, our priority is
			to help students develope study and critical thinking skills, aid them
			through the college application process, and make higher education more
			accesible to everyone.
		</p>
	</section>
</template>

<script>
export default {
	name: "HomePage",
	data() {
		return {
			quotePresent: false,
			quoteText: "",
			quoteAuthor: ""
		};
	},
	created() {
		const updateQuote = async () => {
			const url =
				"https://quote-garden.herokuapp.com/api/v3/quotes?genre=success&limit=100";
			let response = await fetch(url);
			return await response.json();
		};
		updateQuote().then(data => {
			let random = Math.floor(Math.random() * 99);
			let quote = data.data[random];
			this.quoteText = quote.quoteText;
			this.quoteAuthor = quote.quoteAuthor;
			this.quotePresent = true;
		});
	},
	methods: {}
};
</script>

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

@media only screen and (min-width: 1px) and (max-width: 960px) {
	.quote {
		width: 80%;
	}
}
</style>
