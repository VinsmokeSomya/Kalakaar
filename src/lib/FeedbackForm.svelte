<!-- FeedbackForm.svelte -->
<script lang="ts">
  import { MessageSquare, Star, Send, Paperclip, AlertCircle } from 'lucide-svelte';
  
  let rating = 0;
  let feedback = '';
  let email = '';
  let name = '';
  let feedbackType = 'Feedback';
  let suggestFeature = '';
  let isSubmitting = false;
  let showSuccess = false;
  let showError = false;
  let errorMessage = '';
  let priority = 'Medium';
  let contactMe = false;
  let file: File | null = null;
  
  const MAX_FEEDBACK_LENGTH = 1000;
  const MAX_FEATURE_LENGTH = 500;

  $: feedbackCharsLeft = MAX_FEEDBACK_LENGTH - feedback.length;
  $: featureCharsLeft = MAX_FEATURE_LENGTH - suggestFeature.length;
  $: showFileInput = feedbackType === 'Bug Reports';
  $: showPriority = feedbackType === 'Feature Request';

  function handleFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      file = input.files[0];
    }
  }

  const FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSeJ1QU8nqwzHfUn8if5-D7Onc77jd_g9GJ3UG0PwPp21KHfvw/viewform';

  function handleSubmit() {
    if (!email || !feedbackType || rating === 0 || !feedback) {
      errorMessage = 'Please fill in all required fields';
      showError = true;
      return;
    }

    // Construct the Google Form URL with parameters
    const formUrl = new URL(FORM_URL);
    formUrl.searchParams.append('usp', 'pp_url');
    formUrl.searchParams.append('entry.879531967', email);
    formUrl.searchParams.append('entry.1591633300', feedbackType);
    formUrl.searchParams.append('entry.1033077345', rating.toString());
    formUrl.searchParams.append('entry.326955045', feedback);
    formUrl.searchParams.append('entry.1696159737', suggestFeature);
    formUrl.searchParams.append('entry.485428648', name);
    
    // Add priority and contact preference to feedback
    if (showPriority) {
      formUrl.searchParams.append('entry.326955045', `${feedback}\n\nPriority: ${priority}`);
    }
    if (contactMe) {
      formUrl.searchParams.append('entry.326955045', `${feedback}\n\nPlease contact me about this feedback.`);
    }
    
    // Open the pre-filled form in a new tab
    window.open(formUrl.toString(), '_blank');
    
    // Reset form
    rating = 0;
    feedback = '';
    email = '';
    name = '';
    feedbackType = 'Feedback';
    suggestFeature = '';
    priority = 'Medium';
    contactMe = false;
    file = null;
    showSuccess = true;
    showError = false;
  }
</script>

<div class="w-full max-w-2xl mx-auto bg-white dark:bg-slate-800 rounded-xl shadow-md p-6 border border-gray-200 dark:border-gray-700">
  <h2 class="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
    <MessageSquare class="w-5 h-5 text-indigo-600" />
    Feedback
  </h2>

  <form on:submit|preventDefault={handleSubmit} class="space-y-6">
    <!-- Email -->
    <div>
      <label for="email" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Email <span class="text-red-500">*</span>
      </label>
      <input
        type="email"
        id="email"
        bind:value={email}
        required
        class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100"
      />
    </div>

    <!-- Feedback Type -->
    <div>
      <label for="feedbackType" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Feedback Type <span class="text-red-500">*</span>
      </label>
      <select
        id="feedbackType"
        bind:value={feedbackType}
        required
        class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100"
      >
        <option value="Feedback">Feedback</option>
        <option value="Questions">Questions</option>
        <option value="Bug Reports">Bug Reports</option>
        <option value="Feature Request">Feature Request</option>
      </select>
    </div>

    <!-- Rating -->
    <div>
      <label id="rating-label" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Rating <span class="text-red-500">*</span>
      </label>
      <div class="flex gap-1" role="radiogroup" aria-labelledby="rating-label">
        {#each Array(5) as _, i}
          <button
            type="button"
            on:click={() => rating = i + 1}
            class="focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-md p-1 transition-colors"
            aria-label="Rate {i + 1} stars"
            aria-pressed={rating === i + 1}
          >
            <Star
              class="w-6 h-6 {i < rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300 dark:text-gray-600'}"
            />
          </button>
        {/each}
      </div>
    </div>

    <!-- Priority (for Feature Requests) -->
    {#if showPriority}
      <div>
        <label for="priority" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Priority Level
        </label>
        <select
          id="priority"
          bind:value={priority}
          class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100"
        >
          <option value="Low">Low Priority</option>
          <option value="Medium">Medium Priority</option>
          <option value="High">High Priority</option>
          <option value="Critical">Critical Priority</option>
        </select>
      </div>
    {/if}

    <!-- File Upload (for Bug Reports) -->
    {#if showFileInput}
      <div>
        <label for="file" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Attach Screenshot or File
        </label>
        <div class="flex items-center gap-2">
          <label
            for="file"
            class="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <Paperclip class="w-4 h-4" />
            <span class="text-sm">{file ? file.name : 'Choose file...'}</span>
          </label>
          <input
            type="file"
            id="file"
            accept="image/*,.pdf,.txt"
            on:change={handleFileChange}
            class="hidden"
          />
        </div>
        {#if file}
          <p class="mt-1 text-sm text-gray-500">
            File size: {(file.size / 1024).toFixed(1)} KB
          </p>
        {/if}
      </div>
    {/if}

    <!-- Feedback -->
    <div>
      <label for="feedback" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Feedback <span class="text-red-500">*</span>
      </label>
      <div class="relative">
        <textarea
          id="feedback"
          bind:value={feedback}
          required
          maxlength={MAX_FEEDBACK_LENGTH}
          rows="3"
          class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100"
          placeholder="Share your thoughts..."
        ></textarea>
        <div class="absolute bottom-2 right-2 text-xs text-gray-500 dark:text-gray-400">
          {feedbackCharsLeft} characters left
        </div>
      </div>
    </div>

    <!-- Suggest Feature -->
    <div>
      <label for="suggestFeature" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Suggest Feature
      </label>
      <div class="relative">
        <textarea
          id="suggestFeature"
          bind:value={suggestFeature}
          maxlength={MAX_FEATURE_LENGTH}
          rows="2"
          class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100"
          placeholder="Any features you'd like to see?"
        ></textarea>
        <div class="absolute bottom-2 right-2 text-xs text-gray-500 dark:text-gray-400">
          {featureCharsLeft} characters left
        </div>
      </div>
    </div>

    <!-- Name -->
    <div>
      <label for="name" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Name
      </label>
      <input
        type="text"
        id="name"
        bind:value={name}
        class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100"
      />
    </div>

    <!-- Contact Me Checkbox -->
    <div class="flex items-center gap-2">
      <input
        type="checkbox"
        id="contactMe"
        bind:checked={contactMe}
        class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
      />
      <label for="contactMe" class="text-sm text-gray-700 dark:text-gray-300">
        Contact me about this feedback
      </label>
    </div>

    <!-- Submit Button -->
    <button
      type="submit"
      class="w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      <Send class="w-4 h-4" />
      Submit Feedback
    </button>

    <!-- Success Message -->
    {#if showSuccess}
      <div class="p-3 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-100 rounded-md text-sm">
        Thank you for your feedback!
      </div>
    {/if}

    <!-- Error Message -->
    {#if showError}
      <div class="p-3 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-100 rounded-md text-sm flex items-center gap-2">
        <AlertCircle class="w-4 h-4" />
        {errorMessage}
      </div>
    {/if}
  </form>
</div> 