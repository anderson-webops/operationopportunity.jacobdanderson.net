<template>
	<!-------------
  -   Section   -
  -------------->

	<section class="Signup text-center">
		<h1>Signup Under a Tutor</h1>
		<img
			alt="Signing up"
			class="m-5"
			src="https://thumbs.dreamstime.com/b/closeup-person-signing-form-letter-intent-land-acquisition-closeup-person-signing-form-letter-intent-188466918.jpg"
			width="30%"
		/>
		<h2>How does it work?</h2>
		<p class="mt-3">
			You can sign up under a tutor or consultant wherever you are! Simply
			signup, select the tutor you want and your tutor will contact you shortly!
		</p>

		<UserSignup v-if="$root.$data.currentUser || $root.$data.currentAdmin" />
	</section>
</template>

<script>
import UserSignup from "@/components/UserSignup";

export default {
	name: "SignupPage",
	data() {
		return {};
	},

	components: { UserSignup }
};
</script>

<style scoped></style>
