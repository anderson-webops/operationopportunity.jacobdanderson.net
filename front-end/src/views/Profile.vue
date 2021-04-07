<template>
  <!-------------
  -   Section   -
  -------------->

  <section class="Signup text-center">
    <!--   Show Current Tutor Profile   -->
    <label for="tutorSelectProfile">Select a Tutor:</label>
    <select v-model="tutor" id="tutorSelectProfile" required>
      <option
        v-for="tutorIt in getTutorsArray"
        :value="tutorIt"
        v-bind:key="tutorIt.id"
        @click="getUsers && selectTutor(tutorIt)"
      >
        {{ tutorIt.name }}
      </option>
    </select>

    <!--    <label for="tutorName"><h3>Tutor</h3></label>-->
    <h3 id="tutorName">Tutor: {{ $root.$data.currentTutor.name }}</h3>

    <hr />

    <!--   List Tutors   -->
    <h2>Users</h2>
    <div
      class="tutorList mt-2"
      v-show="$root.$data.showUsers"
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
  },
  created() {
    this.getUsers();
  },
  methods: {
    async getUsers() {
      try {
        const response = await axios.get(
          `/api/tutors/${this.$root.$data.currentTutor._id}/users`
        );
        this.$root.$data.users = response.data;
      } catch (error) {
        await this.$root.$data.sendError(error);
      }
    },
    /*    async getUsers() {
      try {
        const response = await axios.get(`/api/users`);
        this.$root.$data.users = response.data;
      } catch (error) {
        await this.$root.$data.sendError(error);
      }
    },*/
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
        await this.getUsers();
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
    selectUser(user) {
      this.user = user;
      this.getUsers();
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
