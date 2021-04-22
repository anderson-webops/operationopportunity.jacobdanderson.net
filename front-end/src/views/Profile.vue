<template>
  <div>
    <AdminProfile v-if="admin" />
    <TutorProfile v-else-if="tutor" />
    <UserProfile v-else-if="user" />
    <div class="loginSignup" v-else>
      <h3>Please login or signup!</h3>
    </div>
  </div>
</template>

<script>
import AdminProfile from "@/components/AdminProfile";
import TutorProfile from "@/components/TutorProfile";
import UserProfile from "@/components/UserProfile";
export default {
  name: "Profile",
  components: {
    AdminProfile,
    TutorProfile,
    UserProfile,
  },
  data() {
    return {};
  },
  computed: {
    admin() {
      return this.$root.$data.currentAdmin;
    },
    tutor() {
      return this.$root.$data.currentTutor;
    },
    user() {
      return this.$root.$data.currentUser;
    },
  },
  created() {},
  methods: {},
};
</script>

<style scoped>
div.loginSignup {
  text-align: center;
}

div {
  margin: 22% 0;
}
</style>
