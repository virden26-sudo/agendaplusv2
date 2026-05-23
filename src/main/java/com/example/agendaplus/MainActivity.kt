package com.example.agendaplus

import android.content.SharedPreferences
import android.os.Bundle
import android.view.Menu
import android.view.MenuItem
import android.widget.EditText
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.edit
import androidx.lifecycle.lifecycleScope
import com.example.agendaplus.databinding.ActivityMainRedesignedBinding
import com.google.android.material.tabs.TabLayoutMediator
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import kotlinx.coroutines.launch

class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainRedesignedBinding
    private lateinit var prefs: SharedPreferences
    private var allItems: MutableList<AgendaItem> = mutableListOf()
    private lateinit var geminiParser: GeminiParser

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainRedesignedBinding.inflate(layoutInflater)
        setContentView(binding.root)

        prefs = getSharedPreferences("AgendaPrefs", MODE_PRIVATE)
        geminiParser = GeminiParser(getString(R.string.gemini_api_key))

        setSupportActionBar(binding.toolbar)

        loadAgenda()

        val adapter = ViewPagerAdapter(this, allItems)
        binding.viewPager.adapter = adapter

        TabLayoutMediator(binding.tabLayout, binding.viewPager) { tab, position ->
            tab.text = when (position) {
                0 -> getString(R.string.assignments)
                1 -> getString(R.string.exams)
                else -> getString(R.string.notes)
            }
        }.attach()

        binding.btnAdd.setOnClickListener { showAddItemDialog() }
        binding.btnImport.setOnClickListener { /* TODO: Implement import */ }
        binding.btnExport.setOnClickListener { /* TODO: Implement export */ }
    }

    private fun showAddItemDialog() {
        val editText = EditText(this)
        AlertDialog.Builder(this)
            .setTitle(R.string.add_item_title)
            .setView(editText)
            .setPositiveButton(R.string.add) { _, _ ->
                val text = editText.text.toString()
                if (text.isNotEmpty()) {
                    lifecycleScope.launch {
                        try {
                            val parsedItems = geminiParser.parseText(text)
                            allItems.addAll(parsedItems)
                            saveAgenda()
                            // TODO: Refresh the appropriate fragment
                            Toast.makeText(this@MainActivity, "Items added successfully!", Toast.LENGTH_SHORT).show()
                        } catch (e: Exception) {
                            Toast.makeText(this@MainActivity, "Error parsing text: ${e.message}", Toast.LENGTH_SHORT).show()
                        }
                    }
                }
            }
            .setNegativeButton(R.string.cancel, null)
            .show()
    }

    private fun saveAgenda() {
        val gson = Gson()
        val json = gson.toJson(allItems)
        prefs.edit { putString("agenda_items", json) }
    }

    private fun loadAgenda() {
        val gson = Gson()
        val json = prefs.getString("agenda_items", null)
        if (json != null) {
            val type = object : TypeToken<MutableList<AgendaItem>>() {}.type
            allItems = gson.fromJson(json, type)
        }
    }

    override fun onCreateOptionsMenu(menu: Menu?): Boolean {
        menuInflater.inflate(R.menu.main_menu, menu)
        return true
    }

    override fun onOptionsItemSelected(item: MenuItem): Boolean {
        return when (item.itemId) {
            R.id.action_sync -> {
                // TODO: Implement sync
                true
            }
            else -> super.onOptionsItemSelected(item)
        }
    }

    fun getItems(itemType: ItemType): List<AgendaItem> {
        return allItems.filter { it.type == itemType }
    }
}
