<template>
  <n-config-provider>
    <n-message-provider>
      <n-dialog-provider>
        <NuxtLayout>
          <main>
            <NuxtPage />
          </main>
        </NuxtLayout>
      </n-dialog-provider>
    </n-message-provider>
  </n-config-provider>
</template>

<script setup>
import { NConfigProvider, NMessageProvider, NDialogProvider } from 'naive-ui'
</script>

<style>
</style>
