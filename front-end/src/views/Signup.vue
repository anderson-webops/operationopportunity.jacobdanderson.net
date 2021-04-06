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
        <input id="firstNameInput" type="text" v-model="name" required />
        <br />
        <label for="emailInput" class="mt-3">Email address: </label>
        <br />
        <input id="emailInput" type="text" v-model="email" required />
        <br />
        <label for="age" class="mt-3">Age: </label>
        <br />
        <input id="age" type="text" v-model="age" required />
        <!--        <br />
        <label for="gender" class="mt-3">Gender: </label>
        <br />
        <input id="gender" type="text" v-model="gender" required />
        <br />
        <label for="city" class="mt-3">City: </label>
        <br />
        <input id="city" type="text" v-model="city" required />-->
        <br />
        <label for="state" class="mt-3">State: </label>
        <br />
        <input id="state" type="text" v-model="state" required />
        <br />

        <button class="mt-3" id="infoSubmit" type="submit">Submit</button>
      </form>

      <button @click="showTutors = !showTutors" v-bind="tutors">
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
          <li v-show="tutor.editTutors"><label>Name:&emsp;<input class="editTutor" type="text" v-model="tutor.name" /></label></li>
          <li v-show="tutor.editTutors"><label>Email:&emsp;<input class="editTutor" type="text" v-model="tutor.email" /></label></li>
          <li v-show="tutor.editTutors"><label>Age:&emsp;<input class="editTutor" type="text" v-model="tutor.age" /></label></li>
<!--          <li v-show="tutor.editTutors"><label for="i4">Gender:</label>&emsp;<input id="i4" class="editTutor" type="text" v-model="tutor.gender" /></li>-->
<!--          <li v-show="tutor.editTutors"><label for="i5">City:</label>&emsp;<input id="i5" class="editTutor" type="text" v-model="tutor.city" /></li>-->
          <li v-show="tutor.editTutors"><label>State:&emsp;<input class="editTutor" type="text" v-model="tutor.state" /></label></li>

          <li v-show="!tutor.editTutors"><label class="hidden">Name:</label>&emsp;<p>{{ tutor.name }}</p></li>
          <li v-show="!tutor.editTutors"><label class="hidden">Email:</label>&emsp;<p>{{ tutor.email }}</p></li>
          <li v-show="!tutor.editTutors"><label class="hidden">Age:</label>&emsp;<p>{{ tutor.age }}</p></li>
<!--          <li v-show="!tutor.editTutors"><label class="hidden" for="p4">Gender:</label>&emsp;<p id="p4">{{ tutor.gender }}</p></li>-->
<!--          <li v-show="!tutor.editTutors"><label class="hidden" for="p5">City:</label>&emsp;<p id="p5">{{ tutor.city }}</p></li>-->
          <li v-show="!tutor.editTutors"><label class="hidden">State:</label>&emsp;<p>{{ tutor.state }}</p></li>
          <!-- eslint-enable-->
        </ul>
        <br />
        <button @click="deleteTutor(tutor)">Delete</button>
        <button @click="editTutor(tutor)" v-bind="tutor">
          {{ tutor.saveEdit }}
        </button>
      </div>
    </div>
  </section>
</template>

<script>
import axios from "axios";

export default {
  name: "Signup",
  data() {
    return {
      tutors: [],
      tutor: null,
      name: "",
      email: "",
      age: "",
      // gender: "",
      // city: "",
      state: "",
      showTutors: false,
      showHide: "Show",
      editTutors: false,
      saveEdit: "Edit",
    };
  },
  computed: {
    addedTutorsArray() {
      return this.tutors;
    },
    showHideTutors() {
      // eslint-disable-next-line vue/no-side-effects-in-computed-properties
      return (this.showHide = this.showTutors ? "Hide" : "Show");
    },
  },
  created() {
    this.getTutors();
  },
  methods: {
    async addTutor() {
      try {
        await axios.post("/api/tutors", {
          name: this.name,
          email: this.email,
          age: this.age,
          // gender: this.gender,
          // city: this.city,
          state: this.state,
          editTutors: false,
          saveEdit: "Edit",
        });
        this.resetData();
        await this.getTutors();
      } catch (error) {
        await this.sendError(error);
      }
    },
    async getTutors() {
      try {
        const response = await axios.get("/api/tutors");
        this.tutors = response.data;
      } catch (error) {
        await this.sendError(error);
      }
    },
    resetData() {
      this.name = "";
      this.email = "";
      this.age = "";
      // this.gender = "";
      // this.city = "";
      this.state = "";
      this.editTutors = false;
    },
    async deleteTutor(tutor) {
      try {
        await axios.delete(`/api/tutors/${tutor._id}`);
        await this.getTutors();
      } catch (error) {
        await this.sendError(error);
      }
    },
    async editTutor(tutor) {
      try {
        await axios.put(`/api/tutors/${tutor._id}`, {
          name: tutor.name,
          email: tutor.email,
          age: tutor.age,
          state: tutor.state,
          editTutors: !tutor.editTutors,
          saveEdit: tutor.editTutors ? "Edit" : "Save",
        });
        await this.getTutors();
        return true;
      } catch (error) {
        await this.sendError(error);
      }
    },
    async getUsers() {
      try {
        const response = await axios.get(`/api/tutors/${this.tutor._id}/users`);
        this.items = response.data;
      } catch (error) {
        await this.sendError(error);
      }
    },
    async addUser() {
      try {
        await axios.post(`/api/tutors/${this.tutor._id}/users`, {
          name: this.name,
          email: this.email,
          age: this.age,
          state: this.state,
        });
        this.resetData();
        await this.getUsers();
      } catch (error) {
        await this.sendError(error);
      }
    },
    async deleteUser(user) {
      try {
        await axios.delete(`/api/tutors/${this.tutor._id}/users/${user._id}`);
        await this.getUsers();
      } catch (error) {
        await this.sendError(error);
      }
    },
    async sendError(error) {
      await axios.post(`/api/error/${error}`, {});
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

@media only screen and (min-width: 1px) and (max-width: 960px) {
  div.tutorList {
    width: 50%;
  }
}
</style>
