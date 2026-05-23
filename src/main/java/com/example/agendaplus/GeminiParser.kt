package com.example.agendaplus

import com.google.ai.client.generativeai.GenerativeModel
import com.google.gson.Gson

class GeminiParser(apiKey: String) {

    private val generativeModel = GenerativeModel(
        modelName = "gemini-pro",
        apiKey = apiKey
    )

    suspend fun parseText(text: String): List<AgendaItem> {
        val prompt = """
        Parse the following text and extract all assignments, quizzes, and discussions.
        For each item, provide the title, a short description, and the due date.
        Format the output as a JSON array, where each object has the following properties:
        - title: The title of the item.
        - description: A short description of the item.
        - time: The due date of the item.
        - type: The type of the item (ASSIGNMENT, QUIZ, or DISCUSSION).

        Here is the text to parse:
        $text
        """

        val response = generativeModel.generateContent(prompt)
        val gson = Gson()
        return gson.fromJson(response.text, Array<AgendaItem>::class.java).toList()
    }
}
