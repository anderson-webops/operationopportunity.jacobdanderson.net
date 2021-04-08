<template>
  <!-------------
  -   Section   -
  -------------->

  <section class="Signup text-center">
    <h2>Tutor</h2>
    <h2 class="mb-3">{{ $root.$data.currentTutor.name }}</h2>

    <!--   Show Current Tutor Profile   -->
    <label for="tutorSelectProfile" class="mr-2">Select a Tutor:</label>
    <select
      v-model="tutor"
      @change="selectTutor(tutor)"
      id="tutorSelectProfile"
      required
    >
      <option
        v-for="tutorIt in getTutorsArray"
        :value="tutorIt"
        v-bind:key="tutorIt.id"
      >
        {{ tutorIt.name }}
      </option>
    </select>

    <hr />

    <!--   List Tutors   -->
    <h2>Users</h2>
    <div
      class="tutorList mt-2"
      v-for="userIt in getUsersArray"
      v-bind:key="userIt.id"
    >
      <br />
      <ul>
        <!-- eslint-disable-->
          <li v-show="userIt.editUsers"><label>Name:&emsp;<input class="editTutor" type="text" v-model="userIt.name" /></label></li>
          <li v-show="userIt.editUsers"><label>Email:&emsp;<input class="editTutor" type="text" v-model="userIt.email" /></label></li>
          <li v-show="userIt.editUsers"><label>Age:&emsp;<input class="editTutor" type="text" v-model="userIt.age" /></label></li>
          <!--          <li v-show="tutor.editTutors"><label for="i4">Gender:</label>&emsp;<input id="i4" class="editTutor" type="text" v-model="tutor.gender" /></li>
                    <li v-show="tutor.editTutors"><label for="i5">City:</label>&emsp;<input id="i5" class="editTutor" type="text" v-model="tutor.city" /></li>-->
          <li v-show="userIt.editUsers"><label>State:&emsp;<input class="editTutor" type="text" v-model="userIt.state" /></label></li>

          <li v-show="!userIt.editUsers"><label class="hidden">Name:</label>&emsp;<p>{{ userIt.name }}</p></li>
          <li v-show="!userIt.editUsers"><label class="hidden">Email:</label>&emsp;<p>{{ userIt.email }}</p></li>
          <li v-show="!userIt.editUsers"><label class="hidden">Age:</label>&emsp;<p>{{ userIt.age }}</p></li>
          <!--          <li v-show="!tutor.editTutors"><label class="hidden" for="p4">Gender:</label>&emsp;<p id="p4">{{ tutor.gender }}</p></li>
                    <li v-show="!tutor.editTutors"><label class="hidden" for="p5">City:</label>&emsp;<p id="p5">{{ tutor.city }}</p></li>-->
          <li v-show="!userIt.editUsers"><label class="hidden">State:</label>&emsp;<p>{{ userIt.state }}</p></li>
          <!-- eslint-enable-->
      </ul>
      <br />
      <button @click="deleteUser(userIt)">Delete</button>
      <button @click="editUser(userIt)" v-bind:string="userIt.saveEdit">
        {{ userIt.saveEdit }}
      </button>
    </div>
  </section>
</template>

<script>
import axios from "axios";

export default {
  name: "Profile",
  data() {
    return {
      tutor: null,
      editUsers: false,
      saveEdit: "Edit",
    };
  },
  computed: {
    getUsersArray() {
      return this.$root.$data.users;
    },
    getTutorsArray() {
      return this.$root.$data.tutors;
    },
    /*    getCurrentTutorName() {
      if (this.$root.$data.currentTutor === null) {
        return this.getTutorsArray[0].name;
      } else {
        return this.$root.$data.currentTutor.name;
      }
    },*/
  },
  created() {
    this.getTutors();
    this.getUsers();
  },
  methods: {
    /*    async getUsers(tutorIt) {
      try {
        tutorIt = this.getTutorsArray[0];
        if (this.$root.$data.currentTutor !== null) {
          tutorIt = this.$root.$data.currentTutor;
          console.log(tutorIt);
        } else this.$root.$data.currentTutor = tutorIt;
        console.log(this.$root.$data.currentTutor);
        console.log(this.$root.$data.currentTutor._id);
        console.log(tutorIt);
        const response = await axios.get(
          `/api/tutors/${this.$root.$data.currentTutor._id}/users`
        );
        this.$root.$data.users = response.data;
      } catch (error) {
        await this.$root.$data.sendError(error);
      }
    },*/
    async getUsers() {
      try {
        if (this.tutor != null) {
          const response = await axios.get(
            `/api/tutors/${this.tutor._id}/users`
          );
          this.$root.$data.users = response.data;
        } else {
          /* if no tutor is currently selected, default to the first tutor in the array */
          const response = await axios.get(
            `/api/tutors/${this.$root.$data.tutors[0]._id}/users`
          );
          this.$root.$data.users = response.data;
        }
      } catch (error) {
        await this.$root.$data.sendError(error);
      }
    },
    async editUser(user) {
      try {
        await axios.put(
          `/api/tutors/${this.$root.$data.currentTutor._id}/users/${user._id}`,
          {
            name: user.name,
            email: user.email,
            age: user.age,
            state: user.state,
            editUsers: !user.editUsers,
            saveEdit: user.editUsers ? "Edit" : "Save",
          }
        );
        await this.getUsers();
        return true;
      } catch (error) {
        await this.$root.$data.sendError(error);
      }
    },
    async deleteUser(user) {
      try {
        await axios.delete(
          `/api/tutors/${this.$root.$data.currentTutor._id}/users/${user._id}`
        );
        if (this.$root.$data.numberOfUsers > 0)
          this.$root.$data.numberOfUsers -= 1;
        await this.getUsers();
      } catch (error) {
        await this.$root.$data.sendError(error);
      }
    },
    async getTutors() {
      try {
        const response = await axios.get("/api/tutors");
        this.$root.$data.tutors = response.data;
        /* Make sure name is loaded for the header */
        if (this.tutor === null) {
          this.$root.$data.currentTutor = this.getTutorsArray[0];
        }
      } catch (error) {
        await this.$root.$data.sendError(error);
      }
    },
    selectTutor() {
      this.$root.$data.currentTutor = this.tutor;
      this.getUsers();
    },
    /*    selectUser(user) {
      this.user = user;
      this.getUsers();
    },*/
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
