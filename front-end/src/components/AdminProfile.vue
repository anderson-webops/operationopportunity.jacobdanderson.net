<template>
	<!-------------
  -   Section   -
  -------------->

	<section class="Signup text-center">
		<!--   Admin's Profile   -->
		<h2>Profile</h2>
		<div v-bind:key="currentAdmin.id" class="tutorList mt-2">
			<br />
			<ul>
				<!-- eslint-disable-->
        <li><h4>Admin</h4></li>
        <li v-show="currentAdmin.editAdmins"><label>Name:&emsp;<input v-model="currentAdmin.name" class="editTutor"
                                                                      type="text"/></label></li>
        <li v-show="currentAdmin.editAdmins"><label>Email:&emsp;<input v-model="currentAdmin.email" class="editTutor"
                                                                       type="text"/></label></li>
        <!--          <li v-show="currentAdmin.editAdmins"><label>Age:&emsp;<input class="editTutor" type="text" v-model="currentAdmin.age" /></label></li>-->
        <!--          <li v-show="currentAdmin.editAdmins"><label>State:&emsp;<input class="editTutor" type="text" v-model="currentAdmin.state" /></label></li>-->

        <li v-show="!currentAdmin.editAdmins"><label class="hidden">Name:</label>&emsp;<p>{{ currentAdmin.name }}</p>
        </li>
        <li v-show="!currentAdmin.editAdmins"><label class="hidden">Email:</label>&emsp;<p>{{ currentAdmin.email }}</p>
        </li>
        <!--          <li v-show="!currentAdmin.editAdmins"><label class="hidden">Age:</label>&emsp;<p>{{ currentAdmin.age }}</p></li>-->
        <!--          <li v-show="!currentAdmin.editAdmins"><label class="hidden">State:</label>&emsp;<p>{{ currentAdmin.state }}</p></li>-->
        <!-- eslint-enable-->
			</ul>
			<br />
			<button @click="deleteAdmin()">Delete</button>
			<button v-bind:string="currentAdmin.saveEdit" @click="editAdmin()">
				{{ currentAdmin.saveEdit }}
			</button>
		</div>

		<hr />

		<!--   List Tutors   -->
		<h2>Tutors</h2>
		<div
			v-for="tutorIt in getTutorsArray"
			v-bind:key="tutorIt.id"
			class="tutorList mt-2"
		>
			<br />
			<ul>
				<!-- eslint-disable-->
        <li><h4>Tutor</h4></li>
        <li v-show="tutorIt.editTutors"><label>Name:&emsp;<input v-model="tutorIt.name" class="editTutor" type="text"/></label>
        </li>
        <li v-show="tutorIt.editTutors"><label>Email:&emsp;<input v-model="tutorIt.email" class="editTutor"
                                                                  type="text"/></label></li>
        <li v-show="tutorIt.editTutors"><label>Age:&emsp;<input v-model="tutorIt.age" class="editTutor"
                                                                type="text"/></label></li>
        <li v-show="tutorIt.editTutors"><label>State:&emsp;<input v-model="tutorIt.state" class="editTutor"
                                                                  type="text"/></label></li>

        <li v-show="!tutorIt.editTutors"><label class="hidden">Name:</label>&emsp;<p>{{ tutorIt.name }}</p></li>
        <li v-show="!tutorIt.editTutors"><label class="hidden">Email:</label>&emsp;<p>{{ tutorIt.email }}</p></li>
        <li v-show="!tutorIt.editTutors"><label class="hidden">Age:</label>&emsp;<p>{{ tutorIt.age }}</p></li>
        <li v-show="!tutorIt.editTutors"><label class="hidden">State:</label>&emsp;<p>{{ tutorIt.state }}</p></li>
        <!-- eslint-enable-->
			</ul>
			<br />
			<button @click="deleteTutor(tutorIt)">Delete</button>
			<button v-bind:string="tutorIt.saveEdit" @click="editTutor(tutorIt)">
				{{ tutorIt.saveEdit }}
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

<script lang="ts">
import axios from "axios";

export default {
	name: "AdminProfile",
	data() {
		return {
			currentAdmin: "",
			editUsers: false,
			editTutors: false,
			editAdmins: false,
			saveEdit: "Edit",
			error: ""
		};
	},
	computed: {
		getUsersArray() {
			return this.$root.$data.users;
		},
		getTutorsArray() {
			return this.$root.$data.tutors;
		}
	},
	async created() {
		try {
			await this.getTutors();
			await this.getUsers();
			this.getCurrentAdmin();
		} catch (error) {
			this.error = "Error: " + error.response.data.message;
		}
	},
	methods: {
		async getUsers() {
			try {
				const response = await axios.get("/api/users/all");
				this.$root.$data.users = response.data;
			} catch (error) {
				this.error = "Error: " + error.response.data.message;
			}
		},
		async editUser(user) {
			try {
				await axios.put(`/api/admins/user/${user._id}`, {
					name: user.name,
					email: user.email,
					age: user.age,
					state: user.state,
					editUsers: !user.editUsers,
					saveEdit: user.editUsers ? "Edit" : "Save"
				});
				await this.getTutors();
				await this.getUsers();
				return true;
			} catch (error) {
				this.error = "Error: " + error.response.data.message;
			}
		},
		async deleteUser(user) {
			try {
				await axios.delete(`/api/admins/user/${user._id}`);
				await this.getUsers();
			} catch (error) {
				this.error = "Error: " + error.response.data.message;
			}
		},
		/*   Reinstate these when Admin functionality is added so that the Admin can manage the tutors   */
		async getTutors() {
			try {
				const response = await axios.get("/api/tutors");
				this.$root.$data.tutors = response.data;
			} catch (error) {
				this.error = "Error: " + error.response.data.message;
			}
		},
		async editTutor(tutor) {
			try {
				await axios.put(`/api/admins/tutor/${tutor._id}`, {
					name: tutor.name,
					email: tutor.email,
					age: tutor.age,
					state: tutor.state,
					editTutors: !tutor.editTutors,
					saveEdit: tutor.editTutors ? "Edit" : "Save"
				});
				await this.getTutors();
				await this.getUsers();
				return true;
			} catch (error) {
				this.error = "Error: " + error.response.data.message;
			}
		},
		async deleteTutor(tutor) {
			try {
				await axios.delete(`/api/admins/tutor/${tutor._id}`);
				await this.getUsers();
			} catch (error) {
				this.error = "Error: " + error.response.data.message;
			}
		},
		/*async addAccount() {
      if (!this.name || !this.age || !this.password) return;

      try {
        await axios.post("/api/accounts", {
          email: this.email,
        });
      } catch (error) {
        this.errorSignup = "Error: " + error.response.data.message;
      }

      try {
        let response = await axios.post("/api/admins", {
          name: this.name,
          email: this.email,
          // age: this.age,
          // state: this.state,
          password: this.password,
          editAdmins: false,
          saveEdit: "Edit",
        });
        this.$root.$data.currentAdmin = response.data.currentAdmin;
      } catch (error) {
        this.$root.$data.currentAdmin = null;
      }
      this.resetData();
    },*/
		/*    async getAdmins() {
      try {
        const response = await axios.get("/api/admins");
        this.$root.$data.admins = response.data;
      } catch (error) {
        this.error = "Error: " + error.response.data.message;
      }
    },*/
		async editAdmin() {
			try {
				await axios.post(`/api/accounts/changeEmail/${this.currentAdmin._id}`, {
					email: this.currentAdmin.email
				});

				await axios.put(`/api/admins/${this.currentAdmin._id}`, {
					name: this.currentAdmin.name,
					email: this.currentAdmin.email,
					// age: this.currentAdmin.age,
					// state: this.currentAdmin.state,
					editAdmins: !this.currentAdmin.editAdmins,
					saveEdit: this.currentAdmin.editAdmins ? "Edit" : "Save"
				});
				await this.refreshAdmin();
				this.error = "";
				return true;
			} catch (error) {
				this.error = "Error: " + error.response.data.message;
			}
		},
		async deleteAdmin() {
			try {
				await axios.delete(`/api/admins/remove/${this.currentAdmin._id}`);
			} catch (error) {
				this.error = "Error: " + error.response.data.message;
			}
		},
		// async refreshUser(user) {
		//   try {
		//     let response = await axios.get(`/api/users/${user._id}`);
		//     this.$root.$data.currentAdmin = response.data.currentAdmin;
		//     this.currentAdmin = this.$root.$data.currentAdmin;
		//   } catch (error) {
		//     this.error = "Error: " + error.response.data.message;
		//   }
		// },
		// async refreshTutor(tutor) {
		//   try {
		//     let response = await axios.get("/api/admins/loggedin");
		//     this.$root.$data.currentAdmin = response.data.currentAdmin;
		//     this.currentAdmin = this.$root.$data.currentAdmin;
		//   } catch (error) {
		//     this.error = "Error: " + error.response.data.message;
		//   }
		// },
		async refreshAdmin() {
			try {
				let response = await axios.get("/api/admins/loggedin");
				this.$root.$data.currentAdmin = response.data.currentAdmin;
				this.currentAdmin = this.$root.$data.currentAdmin;
			} catch (error) {
				this.error = "Error: " + error.response.data.message;
			}
		},
		getCurrentAdmin() {
			this.currentAdmin = this.$root.$data.currentAdmin;
		}
		/*resetData() {
      this.name = "";
      this.email = "";
      this.age = "";
      this.state = "";
      this.password = "";
      this.editAdmin = false;
    },*/
	}
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
