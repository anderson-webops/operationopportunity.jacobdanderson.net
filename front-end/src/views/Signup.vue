<template>
  <!-------------
  -   Section   -
  -------------->

  <section class="Signup text-center">
    <h1>Sign up</h1>
    <img
      src="https://thumbs.dreamstime.com/b/closeup-person-signing-form-letter-intent-land-acquisition-closeup-person-signing-form-letter-intent-188466918.jpg"
      alt="Signing up"
      width="30%"
      class="m-5"
    />
    <h2>Want to help out?</h2>
    <p class="mt-3">
      You can sign up by becoming a tutor or consultant wherever you are!
      Becoming a part of our team means you can join us in the work of bringing
      college within reach for so many.
    </p>

    <h2>How do I join?</h2>

    <div id="signup">
      <form id="signupForm" v-on:submit.prevent="addTutor">
        <label for="firstNameInput" class="mt-3">Full Name: </label>
        <br />
        <input id="firstNameInput" type="text" v-model="name" />
        <br />
        <label for="emailInput" class="mt-3">Email address: </label>
        <br />
        <input id="emailInput" type="text" v-model="email" />
        <br />
        <label for="age" class="mt-3">Age: </label>
        <br />
        <input id="age" type="text" v-model="age" />
        <br />
        <label for="gender" class="mt-3">Gender: </label>
        <br />
        <input id="gender" type="text" v-model="gender" />
        <br />
        <label for="city" class="mt-3">City: </label>
        <br />
        <input id="city" type="text" v-model="city" />
        <br />
        <label for="state" class="mt-3">State: </label>
        <br />
        <input id="state" type="text" v-model="state" />
        <br />
        <!--              <input class="mt-3" id="infoSubmit" type="submit" value="Submit" v-bind:disabled="tutor.personName.length < 2">-->
        <button
          class="mt-3"
          id="infoSubmit"
          type="submit"
          v-bind:disabled="
            name.length < 2 &&
            email.length < 2 &&
            age.length < 1 &&
            gender.length < 2 &&
            city.length < 2 &&
            state.length < 1
          "
        >
          Submit
        </button>
      </form>

      <button @click="showTutors = !showTutors" v-bind="showHideTutors">
        {{ this.showHide }} tutors
      </button>

      <hr v-show="showTutors">

      <div
        v-show="showTutors"
        v-for="tutor in addedTutorsArray"
        v-bind:key="tutor.id"
      >
        <label>
          <input type="text" v-show="tutor.editTutors" v-model="tutor.name" />
          <br />
          <input type="text" v-show="tutor.editTutors" v-model="tutor.email" />
          <br />
          <input type="text" v-show="tutor.editTutors" v-model="tutor.age" />
          <br />
          <input type="text" v-show="tutor.editTutors" v-model="tutor.gender" />
          <br />
          <input type="text" v-show="tutor.editTutors" v-model="tutor.city" />
          <br />
          <input type="text" v-show="tutor.editTutors" v-model="tutor.state" />
        </label>
        <h1 v-show="!tutor.editTutors">{{ tutor.id }}</h1>
        <p v-show="!tutor.editTutors">{{ tutor.name }}</p>
        <p v-show="!tutor.editTutors">{{ tutor.email }}</p>
        <p v-show="!tutor.editTutors">{{ tutor.age }}</p>
        <p v-show="!tutor.editTutors">{{ tutor.gender }}</p>
        <p v-show="!tutor.editTutors">{{ tutor.city }}</p>
        <p v-show="!tutor.editTutors">{{ tutor.state }}</p>
        <br />
        <button @click="removeTutor(tutor.id - 1)">Delete</button>
        <button
          @click="
            (tutor.saveEdit = tutor.editTutors ? 'Edit' : 'Save') &&
              (tutor.editTutors = !tutor.editTutors)
          "
          v-bind="tutor.saveEdit"
        >
          {{ tutor.saveEdit }}
        </button>
      </div>
    </div>
  </section>
</template>

<script>
export default {
  name: "Signup",
  data() {
    return {
      name: "",
      email: "",
      age: "",
      gender: "",
      city: "",
      state: "",
      showTutors: false,
      showHide: "Show",
      editTutors: false,
      saveEdit: "Edit",
    };
  },
  computed: {
    addedTutorsArray() {
      return this.$root.$data.addedTutors;
    },
    showHideTutors() {
      // eslint-disable-next-line vue/no-side-effects-in-computed-properties
      return (this.showHide = this.showTutors ? "Hide" : "Show");
    },
    saveEditTutors() {
      // eslint-disable-next-line vue/no-side-effects-in-computed-properties
      return (this.saveEdit = this.editTutors ? "Edit" : "Save");
    },
  },
  created() {},
  methods: {
    addTutor() {
      this.$root.$data.addTutor(
        this.name,
        this.email,
        this.age,
        this.gender,
        this.city,
        this.state,
        this.editTutors,
        this.saveEdit
      );
      this.resetData();
    },
    resetData() {
      this.name = "";
      this.email = "";
      this.age = "";
      this.gender = "";
      this.city = "";
      this.state = "";
      this.editTutors = false;
    },
    removeTutor(index) {
      this.$root.$data.addedTutors.splice(index, 1);
      for (let i = 0; i < this.$root.$data.addedTutors.length; i++)
        this.$root.$data.addedTutors[i].id = i + 1;
    },
  },
};
</script>

<style scoped></style>
