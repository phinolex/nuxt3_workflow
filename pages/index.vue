<template>
<div>
    <h1>Page d'accueil</h1>
    <p>Bienvenue sur WeFundz Workflow</p>
    
    <div class="links-section">
      <NuxtLink to="/workflow" class="workflow-link">
        <v-btn color="primary" size="large">
          Accéder au Workflow
        </v-btn>
      </NuxtLink>
      
      <NuxtLink to="/questionnaire-builder" class="workflow-link">
        <v-btn color="success" size="large">
          Créateur de Questionnaire
        </v-btn>
      </NuxtLink>
    </div>
    
    <Swiper 
      :slides-per-view="3" 
      :space-between="30"
      :loop="true"
      class="mt-5"
    >
      <SwiperSlide v-for="i in 5" :key="i">
        <div class="slide-content">
          Slide {{ i }}
        </div>
      </SwiperSlide>
    </Swiper>
</div>
</template>

    
<script>
import {
    Swiper,
    SwiperSlide
} from "swiper/vue";
import 'swiper/css';

export default {
    components: {
        Swiper,
        SwiperSlide,
    },
    data() {
        return {
            onSlideChange: '',
            swiper: null,
            active: false,
            jsonData: null,
        }
    },
    async mounted() {
     
    },
    methods: {
       
    }
}
</script>

<style scoped>
.slide-content {
    background: #f0f0f0;
    padding: 40px;
    text-align: center;
    border-radius: 8px;
}

.links-section {
    margin: 30px 0;
    text-align: center;
    display: flex;
    gap: 20px;
    justify-content: center;
}

.workflow-link {
    text-decoration: none;
}

.mt-5 {
    margin-top: 3rem;
}
</style>