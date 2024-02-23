<template>
  <!-------------
  -   Section   -
  -------------->

  <section class="Signup text-center">
    <!--   Tutor's Profile   -->
    <h2>Profile</h2>
    <div v-bind:key="currentTutor.id" class="tutorList mt-2">
      <br />
      <ul>
        <!-- eslint-disable-->
        <li><h4>Tutor</h4></li>
        <li v-show="currentTutor.editTutors"><label>Name:&emsp;<input v-model="currentTutor.name" class="editTutor"
                                                                      type="text"/></label></li>
        <li v-show="currentTutor.editTutors"><label>Email:&emsp;<input v-model="currentTutor.email" class="editTutor"
                                                                       type="text"/></label></li>
        <li v-show="currentTutor.editTutors"><label>Age:&emsp;<input v-model="currentTutor.age" class="editTutor"
                                                                     type="text"/></label></li>
        <li v-show="currentTutor.editTutors"><label>State:&emsp;<input v-model="currentTutor.state" class="editTutor"
                                                                       type="text"/></label></li>

        <li v-show="!currentTutor.editTutors"><label class="hidden">Name:</label>&emsp;<p>{{ currentTutor.name }}</p>
        </li>
        <li v-show="!currentTutor.editTutors"><label class="hidden">Email:</label>&emsp;<p>{{ currentTutor.email }}</p>
        </li>
        <li v-show="!currentTutor.editTutors"><label class="hidden">Age:</label>&emsp;<p>{{ currentTutor.age }}</p></li>
        <li v-show="!currentTutor.editTutors"><label class="hidden">State:</label>&emsp;<p>{{ currentTutor.state }}</p>
        </li>
        <!-- eslint-enable-->
      </ul>
      <br />
      <button @click="deleteCurrentTutor()">Delete</button>
      <button v-bind:string="currentTutor.saveEdit" @click="editCurrentTutor()">
        {{ currentTutor.saveEdit }}
      </button>
    </div>

    <hr />

    <!--   List Users   -->
    <h2>Users</h2>
    <div
      v-for="userIt in getUsersArray"
      v-bind:key="userIt.id"
      class="tutorList mt-2"
    >
      <br />
      <ul>
        <!-- eslint-disable-->
        <li v-show="userIt.editUsers"><label>Name:&emsp;<input v-model="userIt.name" class="editTutor"
                                                               type="text"/></label></li>
        <li v-show="userIt.editUsers"><label>Email:&emsp;<input v-model="userIt.email" class="editTutor"
                                                                type="text"/></label></li>
        <li v-show="userIt.editUsers"><label>Age:&emsp;<input v-model="userIt.age" class="editTutor"
                                                              type="text"/></label></li>
        <li v-show="userIt.editUsers"><label>State:&emsp;<input v-model="userIt.state" class="editTutor"
                                                                type="text"/></label></li>

        <li v-show="!userIt.editUsers"><label class="hidden">Name:</label>&emsp;<p>{{ userIt.name }}</p></li>
        <li v-show="!userIt.editUsers"><label class="hidden">Email:</label>&emsp;<p>{{ userIt.email }}</p></li>
        <li v-show="!userIt.editUsers"><label class="hidden">Age:</label>&emsp;<p>{{ userIt.age }}</p></li>
        <li v-show="!userIt.editUsers"><label class="hidden">State:</label>&emsp;<p>{{ userIt.state }}</p></li>
        <!-- eslint-enable-->
      </ul>
      <br />
      <button @click="deleteUser(userIt)">Delete</button>
      <button v-bind:string="userIt.saveEdit" @click="editUser(userIt)">
        {{ userIt.saveEdit }}
      </button>
    </div>
    <p v-if="error" class="error">{{ error }}</p>
  </section>
</template>

<script>
import axios from "axios";

export default {
  name: "TutorProfile",
  data() {
    return {
      currentTutor: "",
      editTutors: false,
      editUsers: false,
      saveEdit: "Edit",
      error: "",
    };
  },
  computed: {
    getUsersArray() {
      return this.$root.$data.users;
    },
  },
  async created() {
    await this.getUsers();
    this.getCurrentTutor();
  },
  methods: {
    async getUsers() {
      try {
        if (this.$root.$data.currentTutor) {
          const response = await axios.get(
            `/api/users/oftutor/${this.$root.$data.currentTutor._id}`,
          );
          this.$root.$data.users = response.data;
        }
      } catch (error) {
        this.error = "Error: " + error.response.data.message;
      }
    },
    async editUser(user) {
      try {
        await axios.put(`/api/users/tutor/${user._id}`, {
          name: user.name,
          email: user.email,
          age: user.age,
          state: user.state,
          editUsers: !user.editUsers,
          saveEdit: user.editUsers ? "Edit" : "Save",
        });
        // await this.refreshUser();
        await this.getUsers();
        this.error = "";
        return true;
      } catch (error) {
        this.error = "Error: " + error.response.data.message;
      }
    },
    async deleteUser(user) {
      try {
        await axios.delete(`/api/users/tutor/${user._id}`);
        await this.getUsers();
      } catch (error) {
        this.error = "Error: " + error.response.data.message;
      }
    },
    async editCurrentTutor() {
      try {
        await axios.post(`/api/accounts/changeEmail/${this.currentTutor._id}`, {
          email: this.currentTutor.email,
        });

        await axios.put(`/api/tutors/${this.currentTutor._id}`, {
          name: this.currentTutor.name,
          email: this.currentTutor.email,
          age: this.currentTutor.age,
          state: this.currentTutor.state,
          editTutors: !this.currentTutor.editTutors,
          saveEdit: this.currentTutor.editTutors ? "Edit" : "Save",
        });
        await this.refreshTutor();
        this.error = "";
        return true;
      } catch (error) {
        this.error = "Error: " + error.response.data.message;
      }
    },
    async deleteCurrentTutor() {
      try {
        await axios.delete(`/api/tutors/remove/${this.currentTutor._id}`);
      } catch (error) {
        this.error = "Error: " + error.response.data.message;
      }
    },
    async refreshTutor() {
      try {
        let response = await axios.get("/api/tutors/loggedin");
        this.$root.$data.currentTutor = response.data.currentTutor;
        this.currentTutor = this.$root.$data.currentTutor;
      } catch (error) {
        this.error = "Error: " + error.response.data.message;
      }
    },
    getCurrentTutor() {
      this.currentTutor = this.$root.$data.currentTutor;
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
