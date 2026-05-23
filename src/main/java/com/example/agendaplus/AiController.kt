package com.example.agendaplus

object AiController {

    fun generateAgendaItems(): List<AgendaItem> {
        val items = mutableListOf<AgendaItem>()
        items.add(AgendaItem(1, "Math Homework", "Complete exercises 1-10", "2024-06-01", ItemType.ASSIGNMENT))
        items.add(AgendaItem(2, "Science Fair", "Prepare presentation", "2024-06-03", ItemType.EVENT))
        items.add(AgendaItem(3, "History Exam", "Study chapters 5-8", "2024-06-05", ItemType.STUDY))
        return items
    }
}
