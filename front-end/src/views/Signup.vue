<template>
  <!-------------
  -   Section   -
  -------------->

  <section class="Signup text-center">
    <h1>Signup Under a Tutor</h1>
    <img
      src="https://thumbs.dreamstime.com/b/closeup-person-signing-form-letter-intent-land-acquisition-closeup-person-signing-form-letter-intent-188466918.jpg"
      alt="Signing up"
      width="30%"
      class="m-5"
    />
    <h2>How does it work?</h2>
    <p class="mt-3">
      You can sign up under a tutor or consultant wherever you are! Simply enter
      your information, select the tutor you want and your tutor will contact
      you!
    </p>

    <h2 class="mt-5">Sign Up</h2>

    <div id="signup">
      <form id="signupForm" v-on:submit.prevent="addUser">
        <label for="firstNameInput" class="mt-3">Full Name: </label>
        <br />
        <input id="firstNameInput" type="text" v-model="name" required />
        <br />
        <label for="emailInput" class="mt-3">Email address: </label>
        <br />
        <input id="emailInput" type="text" v-model="email" required />
        <br />
        <label for="ageInput" class="mt-3">Age: </label>
        <br />
        <input id="ageInput" type="text" v-model="age" required />
        <!--        <br />
        <label for="gender" class="mt-3">Gender: </label>
        <br />
        <input id="gender" type="text" v-model="gender" required />
        <br />
        <label for="city" class="mt-3">City: </label>
        <br />
        <input id="city" type="text" v-model="city" required />-->
        <br />
        <label for="stateInput" class="mt-3">State: </label>
        <br />
        <input id="stateInput" type="text" v-model="state" required />
        <br />
        <label for="tutorSelect" class="mt-3">Tutor: </label>
        <br />
        <select v-model="tutor" id="tutorSelect" required>
          <!--   FIXME May need to hide and display message saying that a tutor is needed   -->
          <option
            v-for="tutorIt in getTutorsArray"
            :value="tutorIt"
            v-bind:key="tutorIt.id"
          >
            {{ tutorIt.name }}
          </option>
        </select>
        <br />

        <button class="mt-3" id="infoSubmit" type="submit">Submit</button>
      </form>

      <button @click="showTutors = !showTutors" v-bind:string="showHideTutors">
        {{ this.showHide }} tutors
      </button>

      <hr v-show="showTutors" />

      <!--   List Tutors   -->
      <h3>Total Tutors: {{ $root.$data.tutors.length }}</h3>
      <h3>Total Users: {{ $root.$data.numberOfUsers }}</h3>

      <div
        class="tutorList mt-2"
        v-show="showTutors"
        v-for="tutorIt in getTutorsArray"
        v-bind:key="tutorIt.id"
      >
        <br />
        <ul>
          <!-- eslint-disable-->
          <li v-show="tutorIt.editTutors"><label>Name:&emsp;<input class="editTutor" type="text" v-model="tutorIt.name" /></label></li>
          <li v-show="tutorIt.editTutors"><label>Email:&emsp;<input class="editTutor" type="text" v-model="tutorIt.email" /></label></li>
          <li v-show="tutorIt.editTutors"><label>Age:&emsp;<input class="editTutor" type="text" v-model="tutorIt.age" /></label></li>
<!--          <li v-show="tutor.editTutors"><label for="i4">Gender:</label>&emsp;<input id="i4" class="editTutor" type="text" v-model="tutor.gender" /></li>
          <li v-show="tutor.editTutors"><label for="i5">City:</label>&emsp;<input id="i5" class="editTutor" type="text" v-model="tutor.city" /></li>-->
          <li v-show="tutorIt.editTutors"><label>State:&emsp;<input class="editTutor" type="text" v-model="tutorIt.state" /></label></li>

          <li v-show="!tutorIt.editTutors"><label class="hidden">Name:</label>&emsp;<p>{{ tutorIt.name }}</p></li>
          <li v-show="!tutorIt.editTutors"><label class="hidden">Email:</label>&emsp;<p>{{ tutorIt.email }}</p></li>
          <li v-show="!tutorIt.editTutors"><label class="hidden">Age:</label>&emsp;<p>{{ tutorIt.age }}</p></li>
<!--          <li v-show="!tutor.editTutors"><label class="hidden" for="p4">Gender:</label>&emsp;<p id="p4">{{ tutor.gender }}</p></li>
          <li v-show="!tutor.editTutors"><label class="hidden" for="p5">City:</label>&emsp;<p id="p5">{{ tutor.city }}</p></li>-->
          <li v-show="!tutorIt.editTutors"><label class="hidden">State:</label>&emsp;<p>{{ tutorIt.state }}</p></li>
          <li v-show="!tutorIt.editTutors" v-on:load="getUsersSpecificTutors(tutorIt)"><label class="hidden">Users:</label>&emsp;<p>{{ tutorIt.usersOfTutorLength }}</p></li>
          <!-- eslint-enable-->
        </ul>
        <br />
        <button @click="deleteTutor(tutorIt)">Delete</button>
        <button @click="editTutor(tutorIt)" v-bind:string="tutorIt.saveEdit">
          {{ tutorIt.saveEdit }}
        </button>
        <!--        <button @click="selectTutor(tutorIt)">Select</button>-->
      </div>
    </div>
  </section>
</template>

<script>
import axios from "axios";

export default {
  name: "signup",
  data() {
    return {
      name: "",
      email: "",
      age: "",
      state: "",
      tutor: null,
      showTutors: false,
      showHide: "Show",
      editTutors: false,
      saveEdit: "Edit",
      usersOfTutorLength: "",
    };
  },
  computed: {
    getTutorsArray() {
      return this.$root.$data.tutors;
    },
    showHideTutors() {
      // eslint-disable-next-line vue/no-side-effects-in-computed-properties
      return (this.showHide = this.showTutors ? "Hide" : "Show");
    },
  },
  // async mounted(tutor) {
  //   await this.$nextTick();
  //   await this.getUsersSpecificTutors(tutor);
  // },
  created() {
    this.getTutors();
    this.getUsers();
  },
  methods: {
    async addUser() {
      try {
        await axios.post(`/api/tutors/${this.tutor._id}/users`, {
          name: this.name,
          email: this.email,
          age: this.age,
          state: this.state,
          editUsers: !this.editUsers,
          saveEdit: this.editUsers ? "Edit" : "Save",
        });
        this.$root.$data.numberOfUsers += 1;
        await this.getUsers();
        this.resetData();
      } catch (error) {
        await this.$root.$data.sendError(error);
      }
    },
    async getUsers() {
      try {
        if (this.tutor != null) {
          const response = await axios.get(
            `/api/tutors/${this.tutor._id}/users`
          );
          this.$root.$data.users = response.data;
        }
      } catch (error) {
        await this.$root.$data.sendError(error);
      }
    },
    async getUsersSpecificTutors(tutor) {
      try {
        const response = await axios.get(`/api/tutors/${tutor._id}/users`);
        this.usersOfTutorLength = response.data.length;
      } catch (error) {
        await this.$root.$data.sendError(error);
      }
    },
    async getTutors() {
      try {
        const response = await axios.get("/api/tutors");
        this.$root.$data.tutors = response.data;
      } catch (error) {
        await this.$root.$data.sendError(error);
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
        await this.$root.$data.sendError(error);
      }
    },
    async deleteUsersUnderTutor(tutor) {
      try {
        /*FIXME May need to find a way to decrease the "number" of users when deleted this way*/
        await axios.delete(`/api/tutors/${tutor._id}/users`);
        await this.getTutors();
      } catch (error) {
        await this.$root.$data.sendError(error);
      }
    },
    async deleteTutor(tutor) {
      try {
        await this.deleteUsersUnderTutor(tutor);
        await axios.delete(`/api/tutors/${tutor._id}`);
        await this.getTutors();
      } catch (error) {
        await this.$root.$data.sendError(error);
      }
    },
    selectTutor(tutor) {
      this.$root.$data.currentTutor = tutor;
      this.$root.$data.showUsers = true;
      this.$root.$data.profileLink = true;
      this.getUsersSpecificTutors(tutor);
    },
    resetData() {
      this.name = "";
      this.email = "";
      this.age = "";
      this.state = "";
      this.tutor = null;
      this.editTutors = false;
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
