<template>
	<!-------------
  -   Section   -
  -------------->

	<section class="Signup text-center">
		<!--   User's Profile   -->
		<h2>Profile</h2>
		<div v-bind:key="currentUser.id" class="tutorList mt-2">
			<br />
			<ul>
				<!-- eslint-disable-->
        <li><h4>User</h4></li>
        <li v-show="currentUser.editUsers"><label>Name:&emsp;<input v-model="currentUser.name" class="editTutor"
                                                                    type="text"/></label></li>
        <li v-show="currentUser.editUsers"><label>Email:&emsp;<input v-model="currentUser.email" class="editTutor"
                                                                     type="text"/></label></li>
        <li v-show="currentUser.editUsers"><label>Age:&emsp;<input v-model="currentUser.age" class="editTutor"
                                                                   type="text"/></label></li>
        <li v-show="currentUser.editUsers"><label>State:&emsp;<input v-model="currentUser.state" class="editTutor"
                                                                     type="text"/></label></li>

        <li v-show="!currentUser.editUsers"><label class="hidden">Name:</label>&emsp;<p>{{ currentUser.name }}</p></li>
        <li v-show="!currentUser.editUsers"><label class="hidden">Email:</label>&emsp;<p>{{ currentUser.email }}</p>
        </li>
        <li v-show="!currentUser.editUsers"><label class="hidden">Age:</label>&emsp;<p>{{ currentUser.age }}</p></li>
        <li v-show="!currentUser.editUsers"><label class="hidden">State:</label>&emsp;<p>{{ currentUser.state }}</p>
        </li>
        <!-- eslint-enable-->
			</ul>
			<br />
			<button @click="deleteUser()">Delete</button>
			<button v-bind:string="currentUser.saveEdit" @click="editUser()">
				{{ currentUser.saveEdit }}
			</button>
		</div>
		<p v-if="error" class="error">{{ error }}</p>
	</section>
</template>

<script lang="ts">
import axios from "axios";

export default {
	name: "UserProfile",
	data() {
		return {
			currentUser: "",
			editUsers: false,
			saveEdit: "Edit",
			error: ""
		};
	},
	computed: {},
	created() {
		this.getCurrentUser();
	},
	methods: {
		async editUser() {
			try {
				await axios.post(`/api/accounts/changeEmail/${this.currentUser._id}`, {
					email: this.currentUser.email
				});

				await axios.put(`/api/users/user/${this.currentUser._id}`, {
					name: this.currentUser.name,
					email: this.currentUser.email,
					age: this.currentUser.age,
					state: this.currentUser.state,
					editUsers: !this.currentUser.editUsers,
					saveEdit: this.currentUser.editUsers ? "Edit" : "Save"
				});
				await this.refreshUser();
				this.error = "";
				return true;
			} catch (error) {
				this.currentUser.email = this.$root.$data.currentUser.email;
				this.error = "Error: " + error.response.data.message;
			}
		},
		async deleteUser() {
			try {
				await axios.delete(`/api/users/user/${this.currentUser._id}`);
				this.currentUser = null;
				this.$root.$data.currentUser = null;
			} catch (error) {
				this.error = "Error: " + error.response.data.message;
			}
		},
		async refreshUser() {
			try {
				let response = await axios.get("/api/users/loggedin");
				this.$root.$data.currentUser = response.data.currentUser;
				this.currentUser = this.$root.$data.currentUser;
			} catch (error) {
				this.error = "Error: " + error.response.data.message;
			}
		},
		getCurrentUser() {
			this.currentUser = this.$root.$data.currentUser;
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
