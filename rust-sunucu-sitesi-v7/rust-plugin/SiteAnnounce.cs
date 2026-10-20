// SiteAnnounce — Web panelinden gelen duyuruyu oyunda ekranın üstünden kayarak gösterir,
// tık sesi çalar ve birkaç saniye sonra kendiliğinden kaldırır.
// Kurulum: bu dosyayı sunucunun  oxide/plugins/  klasörüne koy (Oxide/uMod gerekir).
// Panel şu komutu RCON ile gönderir:  siteannounce "mesaj" 10
using System.Collections.Generic;
using Oxide.Game.Rust.Cui;
using UnityEngine;

namespace Oxide.Plugins
{
    [Info("SiteAnnounce", "SiteAdmin", "1.0.0")]
    [Description("Panelden gelen duyuruyu kayan banner olarak gösterir")]
    public class SiteAnnounce : RustPlugin
    {
        private const string UiName = "SiteAnnounceUI";
        // Tık sesi. Farklı ses istersen bu yolu değiştir.
        private const string ClickSound = "assets/bundled/prefabs/fx/notice/item.select.fx.prefab";
        private readonly List<Timer> timers = new List<Timer>();

        [ConsoleCommand("siteannounce")]
        private void CmdAnnounce(ConsoleSystem.Arg arg)
        {
            // Sadece sunucu konsolu / RCON kullanabilir, oyuncular kullanamaz.
            if (arg.Connection != null) return;
            string text = arg.GetString(0, "");
            float seconds = Mathf.Clamp(arg.GetFloat(1, 10f), 3f, 60f);
            if (string.IsNullOrEmpty(text)) { arg.ReplyWith("Kullanım: siteannounce \"mesaj\" 10"); return; }
            if (text.Length > 180) text = text.Substring(0, 180);
            Broadcast(text, seconds);
            arg.ReplyWith("Duyuru gönderildi: " + text);
        }

        private void Broadcast(string text, float seconds)
        {
            ClearTimers();
            foreach (var player in BasePlayer.activePlayerList)
            {
                if (player == null || !player.IsConnected) continue;
                PlayClick(player);
                Animate(player, text, true);
            }
            timers.Add(timer.Once(seconds, () =>
            {
                foreach (var player in BasePlayer.activePlayerList)
                    if (player != null && player.IsConnected) Animate(player, text, false);
            }));
        }

        // Kayma efekti: paneli birkaç adımda yukarıdan indirir / yukarı çıkarır.
        private void Animate(BasePlayer player, string text, bool slideIn)
        {
            const int steps = 12;
            int i = 0;
            timers.Add(timer.Repeat(0.03f, steps, () =>
            {
                i++;
                if (player == null || !player.IsConnected) return;
                float t = (float)i / steps;
                float k = 1f - Mathf.Pow(1f - t, 3f);   // yumuşak duruş
                float pos = slideIn ? k : 1f - k;        // 0 = ekran dışı, 1 = yerinde
                Draw(player, text, pos);
                if (!slideIn && i >= steps) CuiHelper.DestroyUi(player, UiName);
            }));
        }

        private void Draw(BasePlayer player, string text, float pos)
        {
            CuiHelper.DestroyUi(player, UiName);
            float top = 1.12f - 0.14f * pos;   // pos=1 iken üstte yerinde
            var c = new CuiElementContainer();
            c.Add(new CuiPanel
            {
                Image = { Color = "0.07 0.09 0.08 0.94" },
                RectTransform = { AnchorMin = "0.28 " + (top - 0.085f).ToString("0.###"), AnchorMax = "0.72 " + top.ToString("0.###") }
            }, "Overlay", UiName);
            c.Add(new CuiPanel
            {
                Image = { Color = "0.9 0.33 0.23 1" },
                RectTransform = { AnchorMin = "0 0", AnchorMax = "0.008 1" }
            }, UiName);
            c.Add(new CuiLabel
            {
                Text = { Text = "<b>DUYURU</b>", FontSize = 11, Align = TextAnchor.UpperLeft, Color = "0.9 0.33 0.23 1" },
                RectTransform = { AnchorMin = "0.03 0.62", AnchorMax = "0.5 0.95" }
            }, UiName);
            c.Add(new CuiLabel
            {
                Text = { Text = text, FontSize = 16, Align = TextAnchor.MiddleLeft, Color = "1 1 1 1" },
                RectTransform = { AnchorMin = "0.03 0.05", AnchorMax = "0.97 0.65" }
            }, UiName);
            CuiHelper.AddUi(player, c);
        }

        private void PlayClick(BasePlayer player)
        {
            var effect = new Effect(ClickSound, player, 0, Vector3.zero, Vector3.forward);
            EffectNetwork.Send(effect, player.net.connection);
        }

        private void ClearTimers()
        {
            foreach (var t in timers) if (t != null && !t.Destroyed) t.Destroy();
            timers.Clear();
        }

        private void Unload()
        {
            ClearTimers();
            foreach (var player in BasePlayer.activePlayerList) CuiHelper.DestroyUi(player, UiName);
        }
    }
}
