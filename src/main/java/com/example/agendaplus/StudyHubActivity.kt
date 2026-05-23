package com.example.agendaplus

import android.content.Intent
import android.content.SharedPreferences
import androidx.core.net.toUri
import android.os.Bundle
import android.util.Log
import android.view.MenuItem
import android.widget.Button
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.appcompat.widget.Toolbar
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken

class StudyHubActivity : AppCompatActivity() {

    private lateinit var prefs: SharedPreferences

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_study_hub)

        prefs = getSharedPreferences(getString(R.string.agenda_prefs), MODE_PRIVATE)
        val apiKey = prefs.getString("api_key", null)
        Log.d("API_KEY", "API Key: $apiKey")

        val toolbar: Toolbar = findViewById(R.id.toolbar)
        setSupportActionBar(toolbar)
        supportActionBar?.setDisplayHomeAsUpEnabled(true)
        supportActionBar?.title = getString(R.string.study_hub)

        val aleksButton: Button = findViewById(R.id.aleks_button)
        val khanAcademyButton: Button = findViewById(R.id.khan_academy_button)
        val studdyBuddyButton: Button = findViewById(R.id.studdy_buddy_button)

        aleksButton.setOnClickListener {
            val url = getString(R.string.aleks_url)
            val intent = Intent(Intent.ACTION_VIEW, url.toUri())
            startActivity(intent)
        }

        khanAcademyButton.setOnClickListener {
            val url = getString(R.string.khan_academy_url)
            val intent = Intent(Intent.ACTION_VIEW, url.toUri())
            startActivity(intent)
        }

        studdyBuddyButton.setOnClickListener {
            val gson = Gson()
            val json = prefs.getString(getString(R.string.agenda_items), null)
            val type = object : TypeToken<MutableList<AgendaItem>>() {}.type
            val agendaItems: MutableList<AgendaItem>? = gson.fromJson(json, type)

            if (agendaItems.isNullOrEmpty()) {
                Toast.makeText(this, getString(R.string.no_agenda_data_for_study_plan), Toast.LENGTH_LONG).show()
            } else {
                Toast.makeText(this, getString(R.string.generating_study_plan), Toast.LENGTH_SHORT).show()
                val studyPlan = generateStudyPlan(agendaItems)
                showStudyPlanDialog(studyPlan)
            }
        }
    }

    private fun generateStudyPlan(agendaItems: List<AgendaItem>): String {
        val studyPlan = StringBuilder()
        studyPlan.append(getString(R.string.study_plan_header))

        // Separate items by type
        val assignments = agendaItems.filter { it.type == ItemType.ASSIGNMENT }.sortedBy { it.time }
        val tasks = agendaItems.filter { it.type == ItemType.TASK }.sortedBy { it.time }
        val events = agendaItems.filter { it.type == ItemType.EVENT }.sortedBy { it.time }

        // Prioritize items
        studyPlan.append(getString(R.string.priority_tasks_header))
        val priorityItems = (assignments + tasks).sortedBy { it.time }.take(3)
        if (priorityItems.isNotEmpty()) {
            priorityItems.forEach { studyPlan.append(getString(R.string.study_plan_item, it.title, it.time)) }
        } else {
            studyPlan.append(getString(R.string.no_immediate_tasks))
        }
        studyPlan.append("\n")

        // Upcoming Exams and Events
        if (events.isNotEmpty()) {
            studyPlan.append(getString(R.string.upcoming_events_header))
            events.forEach { studyPlan.append(getString(R.string.event_item, it.title, it.time)) }
            studyPlan.append("\n")
        }

        // General Study Advice
        studyPlan.append(getString(R.string.study_recommendations_header))
        studyPlan.append(getString(R.string.focus_on_one_task))
        studyPlan.append(getString(R.string.take_regular_breaks))
        studyPlan.append(getString(R.string.review_notes_regularly))

        // Encouragement
        studyPlan.append(getString(R.string.study_plan_footer))

        return studyPlan.toString()
    }

    private fun showStudyPlanDialog(studyPlan: String) {
        androidx.appcompat.app.AlertDialog.Builder(this)
            .setTitle(getString(R.string.study_plan_title))
            .setMessage(studyPlan)
            .setPositiveButton(getString(R.string.close), null)
            .show()
    }

    override fun onOptionsItemSelected(item: MenuItem): Boolean {
        if (item.itemId == android.R.id.home) {
            onBackPressedDispatcher.onBackPressed()
            return true
        }
        return super.onOptionsItemSelected(item)
    }
}