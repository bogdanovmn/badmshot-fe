<template>
  <div class="faq">
    <h1>FAQ</h1>
    <p>
      Сервис показывает случайные кадры из архива матчей по бадминтону.
      Гостям доступно по одному случайному кадру из каждого клуба в сутки.
      После входа открываются полный архив, выбор кадров по игрокам и клубам,
      лайки, любимые кадры, ТОП и облако тэгов.
    </p>
  </div>
</template>

<script setup lang="ts">
</script>

<style scoped>
.faq {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 720px;
  margin: 0 auto;
}

h1 {
  font-size: 1.5rem;
}
</style>
