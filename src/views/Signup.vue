<template>
        <!-------------
        -   Section   -
        -------------->

        <section class="Signup text-center">

            <h1>
                Sign up
            </h1>
            <img src="https://thumbs.dreamstime.com/b/closeup-person-signing-form-letter-intent-land-acquisition-closeup-person-signing-form-letter-intent-188466918.jpg" alt="Signing up" width="30%" class="m-5">
            <h2>
                Want to help out?
            </h2>
            <p>
                You can sign up by becoming a tutor or consultant wherever you are!

                Becoming a part of our team means you can join us in the work of bringing college within reach for so many.
            </p>

            <h2>How do I join?</h2>

            <div id="signup">
                <form id="signupForm">
                    <label for="firstNameInput" class="mt-3">Full Name: </label>
                    <br>
                    <input id="firstNameInput" type="text">
                    <br>
                    <label for="emailInput" class="mt-3">Email address: </label>
                    <br>
                    <input id="emailInput" type="text">
                    <p class="mt-2 mb-0" id="valid"></p>
                    <br>
                    <input class="mt-3" id="infoSubmit" type="submit" value="Submit">
                </form>
            </div>

        </section>
</template>

<script>
export default {
  name: 'Signup',
  components: {},
  data() {},
  computed: {},
}
</script>

<style scoped>

</style>