package com.example.agendaplus

import android.os.Build
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import androidx.recyclerview.widget.LinearLayoutManager
import com.example.agendaplus.databinding.FragmentItemListBinding

class ExamsFragment : Fragment() {

    private var _binding: FragmentItemListBinding? = null
    private val binding get() = _binding!!
    private lateinit var adapter: AgendaAdapter

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentItemListBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        val items = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            arguments?.getParcelableArrayList(ARG_ITEMS, AgendaItem::class.java)
        } else {
            arguments?.getParcelableArrayList(ARG_ITEMS)
        } ?: arrayListOf()
        adapter = AgendaAdapter(items, false, {}, {})
        binding.recyclerView.layoutManager = LinearLayoutManager(context)
        binding.recyclerView.adapter = adapter
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }

    companion object {
        private const val ARG_ITEMS = "items"

        fun newInstance(items: List<AgendaItem>): ExamsFragment {
            val fragment = ExamsFragment()
            val args = Bundle()
            args.putParcelableArrayList(ARG_ITEMS, ArrayList(items))
            fragment.arguments = args
            return fragment
        }
    }
}
