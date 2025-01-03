<template>
	<div>
		<h2 class="mt-5">Sign Up</h2>

		<div id="signup">
			<form id="signupForm" v-on:submit.prevent="addUser">
				<select
					v-if="$root.$data.tutors.length > 0"
					id="tutorSelect"
					v-model="tutor"
					required
				>
					<option
						v-for="tutorIt in getTutorsArray"
						v-bind:key="tutorIt.id"
						:value="tutorIt"
					>
						{{ tutorIt.name }}
					</option>
				</select>
				<p v-else class="notutors">No Tutors are available</p>
				<br />

				<button id="infoSubmit" class="mt-3" type="submit">Submit</button>
			</form>

			<button
				v-show="$root.$data.tutors.length > 0"
				v-bind:string="showHideTutors"
				@click="showTutors = !showTutors"
			>
				{{ this.showHide }} tutors
			</button>

			<hr v-show="showTutors && $root.$data.tutors.length > 0" />

			<!--   List Tutors   -->
			<h3 v-show="$root.$data.tutors.length > 0">
				Total Tutors: {{ $root.$data.tutors.length }}
			</h3>
			<h3 v-show="$root.$data.tutors.length > 0">
				Total Users: {{ numberOfUsers }}
			</h3>

			<div
				v-for="tutorIt in getTutorsArray"
				v-show="showTutors && $root.$data.tutors.length > 0"
				v-bind:key="tutorIt.id"
				class="tutorList mt-2"
			>
				<br />
				<ul>
					<!-- eslint-disable-->
          <!--   DISPLAY   -->
          <li v-show="!tutorIt.editTutors"><label class="hidden">Name:</label>&emsp;<p>{{ tutorIt.name }}</p></li>
          <li v-show="!tutorIt.editTutors"><label class="hidden">Email:</label>&emsp;<p>{{ tutorIt.email }}</p></li>
          <li v-show="!tutorIt.editTutors"><label class="hidden">Age:</label>&emsp;<p>{{ tutorIt.age }}</p></li>
          <li v-show="!tutorIt.editTutors"><label class="hidden">State:</label>&emsp;<p>{{ tutorIt.state }}</p></li>
          <li v-show="!tutorIt.editTutors"><label class="hidden">Users:</label>&emsp;<p>{{
              tutorIt.usersOfTutorLength
            }}</p></li>

          <!--   EDIT   -->
          <li v-show="tutorIt.editTutors"><label>Name:&emsp;<input v-model="tutorIt.name" class="editTutor"
                                                                   type="text"/></label></li>
          <li v-show="tutorIt.editTutors"><label>Email:&emsp;<input v-model="tutorIt.email" class="editTutor"
                                                                    type="text"/></label></li>
          <li v-show="tutorIt.editTutors"><label>Age:&emsp;<input v-model="tutorIt.age" class="editTutor" type="text"/></label>
          </li>
          <li v-show="tutorIt.editTutors"><label>State:&emsp;<input v-model="tutorIt.state" class="editTutor"
                                                                    type="text"/></label></li>
          <!-- eslint-enable-->
				</ul>
				<br />
				<button
					v-show="
						$root.$data.currentAdmin || $root.$data.currentTutor === tutorIt
					"
					@click="deleteTutor(tutorIt)"
				>
					Remove
				</button>
				<button
					v-show="
						$root.$data.currentAdmin || $root.$data.currentTutor === tutorIt
					"
					v-bind:string="tutorIt.saveEdit"
					@click="editTutor(tutorIt)"
				>
					{{ tutorIt.saveEdit }}
				</button>
				<button
					v-show="$root.$data.currentUser"
					v-bind:class="{
						colorSelect: tutorIt === $root.$data.currentUser.tutor
					}"
					@click="selectTutor(tutorIt)"
				>
					Select
				</button>
			</div>
		</div>
		<p v-if="error" class="error">{{ error }}</p>
	</div>
</template>

<script lang="ts">
import axios from "axios";

export default {
	name: "userSignup",
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
			editUsers: false,
			saveEdit: "Edit",
			numberOfUsers: 0,
			error: ""
		};
	},
	computed: {
		getTutorsArray() {
			return this.$root.$data.tutors;
		},
		showHideTutors() {
			// eslint-disable-next-line vue/no-side-effects-in-computed-properties
			return (this.showHide = this.showTutors ? "Hide" : "Show");
		}
	},
	async created() {
		try {
			await this.getTutors();
			await this.getUsers(this.tutor);
		} catch (error) {
			this.error = "Error: " + error.response.data.message;
		}
	},
	methods: {
		async addUser() {
			if (this.tutor == null) return;
			try {
				await axios.post(`/api/users/${this.tutor._id}`, {
					currentUser: this.$root.$data.currentUser
				});
				await this.getUsers(this.tutor);
				await this.getNumberOfUsers();
				this.resetData();
			} catch (error) {
				this.error = "Error: " + error.response.data.message;
			}
		},
		async getUsers(tutor) {
			try {
				await this.getNumberOfUsers();

				if (tutor == null) return;
				if (this.numberOfUsers !== 0) {
					const response = await axios.get(`/api/users/oftutor/${tutor._id}`);
					this.$root.$data.users = response.data;
					await this.numberOfUsersTaughtByTutor(tutor, response.data.length);
				}
			} catch (error) {
				this.error = "Error: " + error.response.data.message;
			}
		},
		async getTutors() {
			try {
				const response = await axios.get("/api/tutors");
				this.$root.$data.tutors = response.data;
				this.tutor = this.$root.$data.tutors[0]; //default the current tutor to the first tutor
			} catch (error) {
				this.error = "Error: " + error.response.data.message;
			}
		},
		async editTutor(tutor) {
			if (
				(!this.$root.$data.admin && this.$root.$data.currentTutor !== tutor) ||
				tutor == null
			)
				return;

			try {
				await axios.put(`/api/tutors/${tutor._id}`, {
					name: tutor.name,
					email: tutor.email,
					age: tutor.age,
					state: tutor.state,
					editTutors: !tutor.editTutors,
					saveEdit: tutor.editTutors ? "Edit" : "Save"
				});
				await this.getTutors();
				return true;
			} catch (error) {
				this.error = "Error: " + error.response.data.message;
			}
		},
		async numberOfUsersTaughtByTutor(tutor, numberOfUsers) {
			if (tutor == null) return;
			try {
				await axios.put(`/api/tutors/${tutor._id}`, {
					name: tutor.name,
					email: tutor.email,
					age: tutor.age,
					state: tutor.state,
					usersOfTutorLength: numberOfUsers,
					editTutors: tutor.editTutors,
					saveEdit: tutor.saveEdit
				});
				await this.getTutors();
				return true;
			} catch (error) {
				this.error = "Error: " + error.response.data.message;
			}
		},
		async deleteTutor(tutor) {
			if (
				(!this.$root.$data.admin && this.$root.$data.currentTutor !== tutor) ||
				tutor == null
			)
				return;

			try {
				await this.getUsers(tutor);

				// await this.deleteUsersUnderTutor(tutor);
				await axios.delete(`/api/users/under/${tutor._id}`);
				await axios.delete(`/api/tutors/remove/${tutor._id}`);
				await this.getTutors();
				await this.getUsers();
			} catch (error) {
				this.error = "Error: " + error.response.data.message;
			}
		},
		async getNumberOfUsers() {
			try {
				const response = await axios.get("/api/users/all");
				this.numberOfUsers = response.data.length;
			} catch (error) {
				this.error = "Error: " + error.response.data.message;
				this.numberOfUsers = 0;
			}
		},
		async selectTutor(tutor) {
			if (this.$root.$data.currentUser == null) return;
			try {
				await axios.put(
					`/api/users/selectTutor/${this.$root.$data.currentUser._id}/${tutor._id}`
				);

				// Refresh the current user
				let response = await axios.get("/api/users/loggedin");
				this.$root.$data.currentUser = response.data.currentUser;
			} catch (error) {
				this.error = "Error: " + error.response.data.message;
			}
		},
		resetData() {
			this.name = "";
			this.email = "";
			this.age = "";
			this.state = "";
			this.tutor = null;
			this.editTutors = false;
			this.editUsers = false;
		}
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

.colorSelect {
	color: blue;
	background: lightblue;
}

div.tutorList {
	outline: black solid 1px;
	padding-bottom: 1%;
	width: 35%;
	margin: auto;
}

.notutors {
	text-align: center;
}

@media only screen and (min-width: 1px) and (max-width: 960px) {
	div.tutorList {
		width: 50%;
	}
}
</style>
