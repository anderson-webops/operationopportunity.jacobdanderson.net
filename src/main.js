import Vue from "vue";
import App from "./App.vue";
import router from "./router";
import mock from "./mock-data.js";

Vue.config.productionTip = false;

let data = {
    currentID: 6,
    tutors: mock,
    addedTutors: [],
    addTutor(id, name, email, age, gender, city, state) {
        this.currentID += 1;
        this.addedTutors.push({
            id: this.currentID,
            name: name,
            email: email,
            age: age,
            gender: gender,
            city: city,
            state: state
        });
    }
}

new Vue({
    router,
    data,
    render: (h) => h(App),
}).$mount("#app");
