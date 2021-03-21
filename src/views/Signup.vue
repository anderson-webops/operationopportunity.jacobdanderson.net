<template>
  <!-------------
  -   Section   -
  -------------->

  <section class="Signup text-center">

      <h1>
          Sign up
      </h1>
      <img src="https://thumbs.dreamstime.com/b/closeup-person-signing-form-letter-intent-land-acquisition-closeup-person-signing-form-letter-intent-188466918.jpg" alt="Signing up" width="30%" class="m-5">
      <h2>
          Want to help out?
      </h2>
      <p>
          You can sign up by becoming a tutor or consultant wherever you are!

          Becoming a part of our team means you can join us in the work of bringing college within reach for so many.
      </p>

      <h2>How do I join?</h2>

      <div id="signup">
          <form id="signupForm" v-on:submit.prevent="addTutor">
              <label for="firstNameInput" class="mt-3">Full Name: </label>
              <br>
              <input id="firstNameInput" type="text" v-model="name">
              <br>
              <label for="emailInput" class="mt-3">Email address: </label>
              <br>
              <input id="emailInput" type="text" v-model="email">
              <br>
              <label for="age" class="mt-3">Age: </label>
              <br>
              <input id="age" type="text" v-model="age">
              <br>
              <label for="gender" class="mt-3">Gender: </label>
              <br>
              <input id="gender" type="text" v-model="gender">
              <br>
              <label for="city" class="mt-3">City: </label>
              <br>
              <input id="city" type="text" v-model="city">
              <br>
              <label for="state" class="mt-3">State: </label>
              <br>
              <input id="state" type="text" v-model="state">
              <br>
<!--              <input class="mt-3" id="infoSubmit" type="submit" value="Submit" v-bind:disabled="tutor.personName.length < 2">-->
              <button class="mt-3" id="infoSubmit" type="submit" v-bind:disabled="name.length < 2 && email.length < 2 && age.length < 1 && gender.length < 2 &&
            city.length < 2 && state.length < 1">Submit</button>
          </form>

          <button @click="showTutors = true">Show tutors</button>
          <button @click="showTutors = false">Hide tutors</button>
          <div v-show="showTutors" v-for="tutor in addedTutorsArray" v-bind:key="tutor.id">
              <h1>{{tutor.id}}</h1>
              <p>{{tutor.name}}</p>
              <p>{{tutor.email}}</p>
              <p>{{tutor.age}}</p>
              <p>{{tutor.gender}}</p>
              <p>{{tutor.city}}</p>
              <p>{{tutor.state}}</p>
            <button @click='removeTutor("tutor.id - 1")'>Delete</button>
          </div>
      </div>

  </section>
</template>

<script>
  export default {
    name: 'Signup',
    data() {
      return {
          name: '',
          email: '',
          age: '',
          gender: '',
          city: '',
          state: '',
          showTutors: false
      }
    },
    computed: {
      addedTutorsArray() {
        return this.$root.$data.addedTutors;
      }
    },
    created() {
      this.addTutorDatabase();
    },
    methods: {
      addTutorDatabase() {
        for (let i = 0; i < 6; i++) {
          this.$root.$data.addedTutors.push(this.$root.$data.tutors[i]);
        }
      },
      addTutor() {
        this.$root.$data.addTutor(this.name, this.email, this.age, this.gender, this.city, this.state)
        this.resetData()
      },
      resetData() {
        this.name = '';
        this.email = '';
        this.age = '';
        this.gender = '';
        this.city = '';
        this.state = '';
      },
      removeTutor(index){
        this.$root.$data.addedTutors.pop(index)
        if (this.$root.$data.currentID > 0)
          this.$root.$data.currentID -= 1;
      }
    }
  }
</script>