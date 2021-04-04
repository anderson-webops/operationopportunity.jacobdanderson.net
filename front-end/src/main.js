import Vue from "vue";
import App from "./App.vue";
import router from "./router";
import mock from "./mock-data.js";

Vue.config.productionTip = false;

let data = {
  currentID: mock.length,
  tutors: mock,
  addedTutors: [],
  addTutor(name, email, age, gender, city, state, editTutors) {
    this.addedTutors.push({
      id: this.addedTutors.length + 1,
      name: name,
      email: email,
      age: age,
      gender: gender,
      city: city,
      state: state,
      editTutors: editTutors,
    });
  },
};

new Vue({
  router,
  data,
  render: (h) => h(App),
}).$mount("#app");
