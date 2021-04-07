<template>
  <!-------------
  -   Section   -
  -------------->

  <section class="Signup text-center">
    <!--   Show Current Tutor Profile   -->
    <div></div>

    <!--   List Tutors   -->
    <div
      class="tutorList mt-2"
      v-show="showUsers"
      v-for="userIt in getUsersArray"
      v-bind:key="userIt.id"
    >
      <br />
      <ul>
        <!-- eslint-disable-->
          <li v-show="userIt.editTutors"><label>Name:&emsp;<input class="editTutor" type="text" v-model="userIt.name" /></label></li>
          <li v-show="userIt.editTutors"><label>Email:&emsp;<input class="editTutor" type="text" v-model="userIt.email" /></label></li>
          <li v-show="userIt.editTutors"><label>Age:&emsp;<input class="editTutor" type="text" v-model="userIt.age" /></label></li>
          <!--          <li v-show="tutor.editTutors"><label for="i4">Gender:</label>&emsp;<input id="i4" class="editTutor" type="text" v-model="tutor.gender" /></li>
                    <li v-show="tutor.editTutors"><label for="i5">City:</label>&emsp;<input id="i5" class="editTutor" type="text" v-model="tutor.city" /></li>-->
          <li v-show="userIt.editTutors"><label>State:&emsp;<input class="editTutor" type="text" v-model="userIt.state" /></label></li>

          <li v-show="!userIt.editTutors"><label class="hidden">Name:</label>&emsp;<p>{{ userIt.name }}</p></li>
          <li v-show="!userIt.editTutors"><label class="hidden">Email:</label>&emsp;<p>{{ userIt.email }}</p></li>
          <li v-show="!userIt.editTutors"><label class="hidden">Age:</label>&emsp;<p>{{ userIt.age }}</p></li>
          <!--          <li v-show="!tutor.editTutors"><label class="hidden" for="p4">Gender:</label>&emsp;<p id="p4">{{ tutor.gender }}</p></li>
                    <li v-show="!tutor.editTutors"><label class="hidden" for="p5">City:</label>&emsp;<p id="p5">{{ tutor.city }}</p></li>-->
          <li v-show="!userIt.editTutors"><label class="hidden">State:</label>&emsp;<p>{{ userIt.state }}</p></li>
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
export default {
  name: "Profile",
  data() {
    return {};
  },
  computed: {},
  created() {},
  methods: {},
};
</script>

<style scoped></style>
