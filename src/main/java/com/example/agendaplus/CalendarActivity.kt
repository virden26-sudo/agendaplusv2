package com.example.agendaplus

import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import com.example.agendaplus.databinding.ActivityCalendarBinding

class CalendarActivity : AppCompatActivity() {

    private lateinit var binding: ActivityCalendarBinding

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityCalendarBinding.inflate(layoutInflater)
        setContentView(binding.root)

        // TODO: Implement calendar functionality
    }
}
