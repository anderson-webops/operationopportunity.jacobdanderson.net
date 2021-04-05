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

      <hr v-show="showTutors" />

      <div
        class="tutorList mt-2"
        v-show="showTutors"
        v-for="tutor in addedTutorsArray"
        v-bind:key="tutor.id"
      >
        <br />
        <ul>
          <!-- eslint-disable-->
          <li v-show="tutor.editTutors"><label for="i1">Name:</label>&emsp;<input id="i1" class="editTutor" type="text" v-model="tutor.name" /></li>
          <li v-show="tutor.editTutors"><label for="i2">Email:</label>&emsp;<input id="i2" class="editTutor" type="text" v-model="tutor.email" /></li>
          <li v-show="tutor.editTutors"><label for="i3">Age:</label>&emsp;<input id="i3" class="editTutor" type="text" v-model="tutor.age" /></li>
          <li v-show="tutor.editTutors"><label for="i4">Gender:</label>&emsp;<input id="i4" class="editTutor" type="text" v-model="tutor.gender" /></li>
          <li v-show="tutor.editTutors"><label for="i5">City:</label>&emsp;<input id="i5" class="editTutor" type="text" v-model="tutor.city" /></li>
          <li v-show="tutor.editTutors"><label for="i6">State:</label>&emsp;<input id="i6" class="editTutor" type="text" v-model="tutor.state" /></li>

          <li v-show="!tutor.editTutors"><label class="hidden" for="p1">Name:</label>&emsp;<p id="p1">{{ tutor.name }}</p></li>
          <li v-show="!tutor.editTutors"><label class="hidden" for="p2">Email:</label>&emsp;<p id="p2">{{ tutor.email }}</p></li>
          <li v-show="!tutor.editTutors"><label class="hidden" for="p3">Age:</label>&emsp;<p id="p3">{{ tutor.age }}</p></li>
          <li v-show="!tutor.editTutors"><label class="hidden" for="p4">Gender:</label>&emsp;<p id="p4">{{ tutor.gender }}</p></li>
          <li v-show="!tutor.editTutors"><label class="hidden" for="p5">City:</label>&emsp;<p id="p5">{{ tutor.city }}</p></li>
          <li v-show="!tutor.editTutors"><label class="hidden" for="p6">State:</label>&emsp;<p id="p6">{{ tutor.state }}</p></li>
          <!-- eslint-enable-->
        </ul>
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

<style scoped>
ul {
  display: flex;
  flex-flow: column;
}

ul p {
  display: inline;
}

div.tutorList, li /* eslint-disable */ {
  align-self: center;
}

.hidden {
  display: none;
}

div.tutorList {
  outline: black solid 1px;
  padding-bottom: 1%;
  width: 35%;
  margin: auto;
}
</style>
