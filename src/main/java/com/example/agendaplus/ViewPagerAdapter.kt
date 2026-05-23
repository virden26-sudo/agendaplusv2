package com.example.agendaplus

import androidx.fragment.app.Fragment
import androidx.fragment.app.FragmentActivity
import androidx.viewpager2.adapter.FragmentStateAdapter

class ViewPagerAdapter(fragmentActivity: FragmentActivity, private val items: List<AgendaItem>) : FragmentStateAdapter(fragmentActivity) {

    override fun getItemCount(): Int = 3

    override fun createFragment(position: Int): Fragment {
        return when (position) {
            0 -> AssignmentsFragment.newInstance(items.filter { it.type == ItemType.ASSIGNMENT })
            1 -> ExamsFragment.newInstance(items.filter { it.type == ItemType.GRADE })
            else -> NotesFragment.newInstance(items.filter { it.type == ItemType.TASK })
        }
    }
}
