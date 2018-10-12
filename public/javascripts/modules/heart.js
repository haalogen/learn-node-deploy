import axios from 'axios';
import { $ } from './bling';

function ajaxHeart (event) {
  event.preventDefault(); // Stop form from submitting itself
  axios
    .post(this.action) // Form action
    .then((res) => {
      // "heart" property is from "name" attribute of a form input
      const isHearted = this.heart.classList.toggle('heart__button--hearted')
      $('.heart-count').textContent = res.data.hearts.length;
      // Animate hearting
      if (isHearted) {
        this.heart.classList.add('heart__button--float');
        // Remove class after a couple a seconds
        setTimeout(() => this.heart.classList.remove('heart__button--float'), 2500);
      }
    })
    .catch()
}

export default ajaxHeart;