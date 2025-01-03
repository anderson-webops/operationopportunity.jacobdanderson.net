<template>
	<section class="Signup text-center">
		<!-- User's Profile -->
		<h2>Profile</h2>
		<div v-if="currentUser" :key="currentUser._id" class="tutorList mt-2">
			<br />
			<ul>
				<li><h4>User</h4></li>

				<!-- Editable fields -->
				<li v-show="currentUser.editUsers">
					<label>
						Name:&emsp;
						<input v-model="currentUser.name" class="editTutor" type="text" />
					</label>
				</li>
				<li v-show="currentUser.editUsers">
					<label>
						Email:&emsp;
						<input v-model="currentUser.email" class="editTutor" type="text" />
					</label>
				</li>
				<li v-show="currentUser.editUsers">
					<label>
						Age:&emsp;
						<input v-model="currentUser.age" class="editTutor" type="text" />
					</label>
				</li>
				<li v-show="currentUser.editUsers">
					<label>
						State:&emsp;
						<input v-model="currentUser.state" class="editTutor" type="text" />
					</label>
				</li>

				<!-- Display fields -->
				<li v-show="!currentUser.editUsers">
					<label class="hidden">Name:</label>&emsp;<p>{{ currentUser.name }}</p>
				</li>
				<li v-show="!currentUser.editUsers">
					<label class="hidden">Email:</label>&emsp;<p>{{ currentUser.email }}</p>
				</li>
				<li v-show="!currentUser.editUsers">
					<label class="hidden">Age:</label>&emsp;<p>{{ currentUser.age }}</p>
				</li>
				<li v-show="!currentUser.editUsers">
					<label class="hidden">State:</label>&emsp;<p>{{ currentUser.state }}</p>
				</li>
			</ul>
			<br />
			<button @click="deleteUser()">Delete</button>
			<button :string="currentUser.saveEdit" @click="editUser()">
				{{ currentUser.saveEdit }}
			</button>
		</div>
		<p v-if="error" class="error">{{ error }}</p>
	</section>
</template>

<script lang="ts">
import { defineComponent, ref, computed } from "vue";
import { useStore } from "vuex";
import axios from "axios";

export default defineComponent({
	name: "UserProfile",
	setup() {
		const store = useStore();
		const error = ref<string>("");

		// Computed from store
		const currentUser = computed(() => store.state.currentUser);

		// Methods
		const editUser = async () => {
			if (!currentUser.value) return;
			try {
				// Possibly update user email first
				await axios.post(`/api/accounts/changeEmail/${currentUser.value._id}`, {
					email: currentUser.value.email,
				});

				// Then update user data
				await axios.put(`/api/users/user/${currentUser.value._id}`, {
					name: currentUser.value.name,
					email: currentUser.value.email,
					age: currentUser.value.age,
					state: currentUser.value.state,
					editUsers: !currentUser.value.editUsers,
					saveEdit: currentUser.value.editUsers ? "Edit" : "Save",
				});
				await refreshUser();
				error.value = "";
			} catch (err: any) {
				if (store.state.currentUser) {
					// revert local changes
					currentUser.value.email = store.state.currentUser.email;
				}
				error.value = "Error: " + err.response?.data?.message;
			}
		};

		const deleteUser = async () => {
			if (!currentUser.value) return;
			try {
				await axios.delete(`/api/users/user/${currentUser.value._id}`);
				// remove from store
				store.commit("setCurrentUser", null);
			} catch (err: any) {
				error.value = "Error: " + err.response?.data?.message;
			}
		};

		const refreshUser = async () => {
			try {
				const response = await axios.get("/api/users/loggedin");
				store.commit("setCurrentUser", response.data.currentUser);
			} catch (err: any) {
				error.value = "Error: " + err.response?.data?.message;
			}
		};

		// Lifecycle: optionally fetch user if needed
		// For example, if the user is not set in the store
		// you could do:
		// onMounted(() => { if (!currentUser.value) refreshUser(); });

		return {
			error,
			currentUser,
			editUser,
			deleteUser,
			refreshUser,
		};
	},
});
</script>

<style scoped>
ul {
	display: flex;
	flex-flow: column;
}
ul p {
	display: inline;
}
div.tutorList,
li {
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
.error {
	color: red;
	margin-top: 10px;
}
</style>
